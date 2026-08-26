import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

function parseData(v: string | null, fimDoDia: boolean): Date | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}${fimDoDia ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// Histórico de eventos das demandas.
// - Sem filtro: lista geral, com filtro opcional por período (`?desde=` / `?ate=`, AAAA-MM-DD).
//   Estoque (admin) vê tudo; Almoxarifado e Fundição veem só o histórico de demandas do
//   próprio setor (mesma regra usada para listar as demandas).
// - Com `?demandaId=`: histórico de uma demanda específica, disponível para qualquer usuário
//   autenticado (todos já podem ver todas as demandas, então também podem ver o histórico delas).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const demandaIdParam = searchParams.get("demandaId");
  const demandaId = demandaIdParam ? Number(demandaIdParam) : null;

  if (demandaId && Number.isInteger(demandaId) && demandaId > 0) {
    const auth = await requireUser();
    if ("error" in auth) return auth.error;

    const eventos = await prisma.historicoEvento.findMany({
      where: { demandaId },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ eventos });
  }

  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const desde = parseData(searchParams.get("desde"), false);
  const ate = parseData(searchParams.get("ate"), true);

  const where: Prisma.HistoricoEventoWhereInput = {};
  if (desde || ate) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = desde;
    if (ate) where.createdAt.lte = ate;
  }

  // Almoxarifado e Fundição só veem o histórico das demandas do próprio setor (que
  // solicitaram ou que são responsáveis por atender) — o Estoque (admin) continua vendo tudo.
  if (auth.session.role !== "ADMIN") {
    where.OR = [
      { demandaSetorSolicitante: auth.session.setor },
      { demandaSetorResponsavel: auth.session.setor },
    ];
  }

  const eventos = await prisma.historicoEvento.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });

  return NextResponse.json({ eventos });
}
