import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";

// Histórico de eventos das demandas.
// - Sem filtro: lista completa, restrita ao administrador (Estoque).
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

  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const eventos = await prisma.historicoEvento.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });

  return NextResponse.json({ eventos });
}
