import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { registrarEvento } from "@/lib/historico";
import { PRIORIDADE_LABEL, SETOR_LABEL } from "@/lib/constants";
import type { Prisma, Prioridade, Setor, StatusDemanda } from "@/generated/prisma/client";

const SETOR_VALUES = ["ESTOQUE", "ALMOXARIFADO", "FUNDICAO"] as const;
// Estoque só solicita — nunca é o setor responsável por atender uma demanda.
const SETOR_RESPONSAVEL_VALUES = ["ALMOXARIFADO", "FUNDICAO"] as const;
const STATUS_VALUES = ["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA", "CANCELADA"] as const;
const PRIORIDADE_VALUES = ["BAIXA", "MEDIA", "ALTA"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const setorResponsavel = searchParams.get("setorResponsavel");
  const setorSolicitante = searchParams.get("setorSolicitante");
  const prioridade = searchParams.get("prioridade");
  const q = searchParams.get("q")?.trim();
  const somenteMinhas = searchParams.get("somenteMinhas") === "1";

  const where: Prisma.DemandaWhereInput = {};

  if (status && (STATUS_VALUES as readonly string[]).includes(status)) {
    where.status = status as StatusDemanda;
  }
  if (setorResponsavel && (SETOR_VALUES as readonly string[]).includes(setorResponsavel)) {
    where.setorResponsavel = setorResponsavel as Setor;
  }
  if (setorSolicitante && (SETOR_VALUES as readonly string[]).includes(setorSolicitante)) {
    where.setorSolicitante = setorSolicitante as Setor;
  }
  if (prioridade && (PRIORIDADE_VALUES as readonly string[]).includes(prioridade)) {
    where.prioridade = prioridade as Prioridade;
  }
  if (somenteMinhas) {
    where.criadoPorId = auth.session.userId;
  }
  if (q) {
    where.OR = [
      { titulo: { contains: q } },
      { descricao: { contains: q } },
    ];
  }

  const demandas = await prisma.demanda.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      criadoPor: { select: { id: true, nome: true, setor: true } },
    },
  });

  return NextResponse.json({ demandas, session: auth.session });
}

const dataOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Data inválida.")
  .optional()
  .nullable();

const createSchema = z.object({
  titulo: z.string().trim().min(3, "Título muito curto.").max(200),
  descricao: z.string().trim().max(2000).optional().nullable(),
  setorResponsavel: z.enum(SETOR_RESPONSAVEL_VALUES),
  prioridade: z.enum(PRIORIDADE_VALUES).optional(),
  prazo: dataOpcional,
});

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const { titulo, descricao, setorResponsavel, prioridade, prazo } = parsed.data;
  const setorSolicitante = auth.session.setor;

  if (setorResponsavel === setorSolicitante) {
    return NextResponse.json(
      { error: "O setor responsável deve ser diferente do setor solicitante." },
      { status: 400 }
    );
  }

  const demanda = await prisma.demanda.create({
    data: {
      titulo,
      descricao: descricao || null,
      setorResponsavel,
      setorSolicitante,
      prioridade: prioridade ?? "MEDIA",
      prazo: prazo ? new Date(prazo) : null,
      criadoPorId: auth.session.userId,
    },
    include: {
      criadoPor: { select: { id: true, nome: true, setor: true } },
    },
  });

  await registrarEvento({
    demandaId: demanda.id,
    demandaTitulo: demanda.titulo,
    tipo: "CRIADA",
    descricao: `Demanda criada por ${auth.session.nome} (${SETOR_LABEL[setorSolicitante]}) para ${SETOR_LABEL[setorResponsavel]}, prioridade ${PRIORIDADE_LABEL[demanda.prioridade]}.`,
    usuarioNome: auth.session.nome,
    usuarioSetor: auth.session.setor,
  });

  return NextResponse.json({ demanda }, { status: 201 });
}
