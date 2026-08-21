import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";

const SETOR_VALUES = ["ESTOQUE", "ALMOXARIFADO", "FUNDICAO"] as const;
const STATUS_VALUES = ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"] as const;
const PRIORIDADE_VALUES = ["BAIXA", "MEDIA", "ALTA"] as const;

const patchSchema = z
  .object({
    titulo: z.string().trim().min(3, "Título muito curto.").max(200).optional(),
    descricao: z.string().trim().max(2000).optional().nullable(),
    setorResponsavel: z.enum(SETOR_VALUES).optional(),
    prioridade: z.enum(PRIORIDADE_VALUES).optional(),
    status: z.enum(STATUS_VALUES).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nada para atualizar." });

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const demanda = await prisma.demanda.findUnique({ where: { id } });
  if (!demanda) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });

  const { session } = auth;
  const isAdmin = session.role === "ADMIN";
  const isCriador = demanda.criadoPorId === session.userId;
  const isResponsavel = demanda.setorResponsavel === session.setor;

  const canEditFull = isAdmin || isCriador;
  const canChangeStatus = canEditFull || isResponsavel;

  const changedKeys = Object.keys(parsed.data);
  const somenteStatus = changedKeys.length === 1 && changedKeys[0] === "status";
  const permitido = somenteStatus ? canChangeStatus : canEditFull;

  if (!permitido) {
    return NextResponse.json(
      { error: "Você não tem permissão para editar esta demanda." },
      { status: 403 }
    );
  }

  const data = { ...parsed.data };
  const setorResponsavelFinal = data.setorResponsavel ?? demanda.setorResponsavel;
  if (setorResponsavelFinal === demanda.setorSolicitante) {
    return NextResponse.json(
      { error: "O setor responsável deve ser diferente do setor solicitante." },
      { status: 400 }
    );
  }

  const atualizada = await prisma.demanda.update({
    where: { id },
    data,
    include: {
      criadoPor: { select: { id: true, nome: true, setor: true } },
    },
  });

  return NextResponse.json({ demanda: atualizada });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const demanda = await prisma.demanda.findUnique({ where: { id } });
  if (!demanda) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });

  await prisma.demanda.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
