// Resumo do que foi produzido (itens registrados nas demandas): total de peças, quantos
// códigos diferentes e quantas demandas foram solicitadas no período. Mesma regra de
// visibilidade por setor usada no resto do app — Estoque (admin) vê tudo, Almoxarifado e
// Fundição só veem as demandas do próprio setor (que solicitaram ou que atendem).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

function parseData(v: string | null, fimDoDia: boolean): Date | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}${fimDoDia ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const desde = parseData(searchParams.get("desde"), false);
  const ate = parseData(searchParams.get("ate"), true);

  const where: Prisma.DemandaWhereInput = {};
  if (desde || ate) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = desde;
    if (ate) where.createdAt.lte = ate;
  }
  if (auth.session.role !== "ADMIN") {
    where.OR = [{ setorSolicitante: auth.session.setor }, { setorResponsavel: auth.session.setor }];
  }

  const demandas = await prisma.demanda.findMany({
    where,
    select: {
      id: true,
      itens: { select: { codigo: true, quantidade: true } },
    },
  });

  const porCodigo = new Map<string, { quantidade: number; demandas: Set<number> }>();
  let totalPecasProduzidas = 0;

  for (const d of demandas) {
    for (const item of d.itens) {
      totalPecasProduzidas += item.quantidade;
      const atual = porCodigo.get(item.codigo) ?? { quantidade: 0, demandas: new Set<number>() };
      atual.quantidade += item.quantidade;
      atual.demandas.add(d.id);
      porCodigo.set(item.codigo, atual);
    }
  }

  const itensPorCodigo = Array.from(porCodigo.entries())
    .map(([codigo, v]) => ({ codigo, quantidade: v.quantidade, demandas: v.demandas.size }))
    .sort((a, b) => b.quantidade - a.quantidade);

  return NextResponse.json({
    demandasSolicitadas: demandas.length,
    totalPecasProduzidas,
    tiposDePeca: porCodigo.size,
    itensPorCodigo,
  });
}
