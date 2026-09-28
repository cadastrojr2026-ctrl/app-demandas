// Remove uma baixa registrada por engano — mesma permissão de quem pode registrar uma (admin,
// criador da demanda ou setor responsável). A quantidade do item nunca foi alterada pela baixa,
// então removê-la só devolve aquela quantidade ao "restante a entregar".
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { registrarEvento } from "@/lib/historico";

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ baixaId: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { baixaId: baixaIdParam } = await params;
  const baixaId = parseId(baixaIdParam);
  if (!baixaId) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const baixa = await prisma.itemBaixa.findUnique({
    where: { id: baixaId },
    include: {
      item: {
        select: {
          codigo: true,
          demanda: {
            select: {
              id: true,
              titulo: true,
              criadoPorId: true,
              setorSolicitante: true,
              setorResponsavel: true,
            },
          },
        },
      },
    },
  });
  if (!baixa) return NextResponse.json({ error: "Baixa não encontrada." }, { status: 404 });

  const { session } = auth;
  const { demanda } = baixa.item;
  const isAdmin = session.role === "ADMIN";
  const isCriador = demanda.criadoPorId === session.userId;
  const isResponsavel = demanda.setorResponsavel === session.setor;
  const podeRemover = isAdmin || isCriador || isResponsavel;
  if (!podeRemover) {
    return NextResponse.json(
      { error: "Você não tem permissão para remover baixas nesta demanda." },
      { status: 403 }
    );
  }

  await prisma.itemBaixa.delete({ where: { id: baixaId } });

  await registrarEvento({
    demandaId: demanda.id,
    demandaTitulo: demanda.titulo,
    tipo: "EDITADA",
    descricao: `Baixa removida em "${baixa.item.codigo}": ${baixa.quantidade} un. por ${session.nome} (${session.setor}).`,
    usuarioNome: session.nome,
    usuarioSetor: session.setor,
    demandaSetorSolicitante: demanda.setorSolicitante,
    demandaSetorResponsavel: demanda.setorResponsavel,
  });

  return NextResponse.json({ ok: true });
}
