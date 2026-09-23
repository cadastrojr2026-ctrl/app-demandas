// Resumo do que foi produzido (itens registrados nas demandas): total de peças, quantos
// códigos diferentes e quantas demandas foram solicitadas no período — separadas por setor
// solicitante, com a lista de cada demanda (não só um número). Mesma regra de visibilidade
// por setor usada no resto do app — Estoque (admin) vê tudo, Almoxarifado e Fundição só veem
// as demandas do próprio setor (que solicitaram ou que atendem).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildProducaoWhere } from "@/lib/producaoFiltro";
import { SETORES } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const where = buildProducaoWhere(searchParams, auth.session);

  const demandas = await prisma.demanda.findMany({
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
