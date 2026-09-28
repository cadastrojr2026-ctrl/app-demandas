// Registra uma baixa (entrega parcial) contra um item já produzido — cada baixa é um registro
// imutável com sua própria data, sem nunca alterar a "quantidade" do item (que continua
// alimentando os relatórios de produção como o total produzido/pedido).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { registrarEvento } from "@/lib/historico";
import { baixaSchema } from "@/lib/itemProduzido";

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { itemId: itemIdParam } = await params;
  const itemId = parseId(itemIdParam);
  if (!itemId) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = baixaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const item = await prisma.itemProduzido.findUnique({
    where: { id: itemId },
    include: {
      demanda: {
        select: {
          id: true,
          titulo: true,
          criadoPorId: true,
          setorSolicitante: true,
          setorResponsavel: true,
        },
      },
      baixas: { select: { quantidade: true } },
    },
  });
  if (!item) return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });

  const { session } = auth;
  const isAdmin = session.role === "ADMIN";
  const isCriador = item.demanda.criadoPorId === session.userId;
  const isResponsavel = item.demanda.setorResponsavel === session.setor;
  const podeRegistrar = isAdmin || isCriador || isResponsavel;
  if (!podeRegistrar) {
    return NextResponse.json(
      { error: "Você não tem permissão para registrar baixas nesta demanda." },
      { status: 403 }
    );
  }

  // Aceita baixa mesmo que ultrapasse a quantidade registrada no item (ex: item de 1000,
  // baixas somam 1010) — a peça pode ter sido entregue a mais do que o previsto.
  const jaEntregue = item.baixas.reduce((soma, b) => soma + b.quantidade, 0);

  const baixa = await prisma.itemBaixa.create({
    data: {
      itemProduzidoId: item.id,
      quantidade: parsed.data.quantidade,
      criadoPorId: session.userId,
    },
    select: {
      id: true,
      quantidade: true,
      createdAt: true,
      criadoPor: { select: { nome: true } },
    },
  });

  await registrarEvento({
    demandaId: item.demanda.id,
    demandaTitulo: item.demanda.titulo,
    tipo: "EDITADA",
    descricao: `Baixa registrada em "${item.codigo}": ${parsed.data.quantidade} un. entregue(s) (${jaEntregue + parsed.data.quantidade} de ${item.quantidade}) por ${session.nome} (${session.setor}).`,
    usuarioNome: session.nome,
    usuarioSetor: session.setor,
    demandaSetorSolicitante: item.demanda.setorSolicitante,
    demandaSetorResponsavel: item.demanda.setorResponsavel,
  });

  return NextResponse.json({ baixa }, { status: 201 });
}
