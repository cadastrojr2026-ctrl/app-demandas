// Resumo da produção: total de peças efetivamente entregues (soma das baixas, não a
// quantidade registrada no item) e quantos códigos diferentes, no período — filtrado pela data
// de cada baixa, pra uma entrega feita esse mês contar nesse mês mesmo que a demanda seja
// antiga. "Demandas solicitadas" continua contando pela data da demanda (visão separada, não
// depende de já ter baixa). Mesma regra de visibilidade por setor usada no resto do app —
// Estoque (admin) vê tudo, Almoxarifado e Fundição só veem as demandas do próprio setor.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildProducaoWhere, buildBaixasWhere } from "@/lib/producaoFiltro";
import { SETORES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const where = buildProducaoWhere(searchParams, auth.session);
  const baixasWhere = buildBaixasWhere(searchParams, auth.session);

  const [demandas, baixas] = await Promise.all([
    prisma.demanda.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        titulo: true,
        status: true,
        setorSolicitante: true,
        setorResponsavel: true,
        createdAt: true,
        criadoPor: { select: { nome: true } },
      },
    }),
    prisma.itemBaixa.findMany({
      where: baixasWhere,
      select: {
        quantidade: true,
        item: { select: { codigo: true, demandaId: true } },
      },
    }),
  ]);

  const porCodigo = new Map<string, { quantidade: number; demandas: Set<number> }>();
  let totalPecasProduzidas = 0;

  for (const b of baixas) {
    totalPecasProduzidas += b.quantidade;
    const atual = porCodigo.get(b.item.codigo) ?? { quantidade: 0, demandas: new Set<number>() };
    atual.quantidade += b.quantidade;
    atual.demandas.add(b.item.demandaId);
    porCodigo.set(b.item.codigo, atual);
  }

  const itensPorCodigo = Array.from(porCodigo.entries())
    .map(([codigo, v]) => ({ codigo, quantidade: v.quantidade, demandas: v.demandas.size }))
    .sort((a, b) => b.quantidade - a.quantidade);

  // Agrupa as demandas por setor solicitante — em vez de só contar quantas foram pedidas por
  // cada um, lista as próprias demandas (a pessoa consegue ver quais são, não só um número).
  const porSolicitante = SETORES.map((setor) => ({
    setor,
    demandas: demandas
      .filter((d) => d.setorSolicitante === setor)
      .map((d) => ({
        id: d.id,
        titulo: d.titulo,
        status: d.status,
        setorResponsavel: d.setorResponsavel,
        criadoPorNome: d.criadoPor.nome,
        createdAt: d.createdAt,
      })),
  })).filter((grupo) => grupo.demandas.length > 0);

  return NextResponse.json({
    demandasSolicitadas: demandas.length,
    totalPecasProduzidas,
    tiposDePeca: porCodigo.size,
    itensPorCodigo,
    porSolicitante,
  });
}
