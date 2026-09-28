// Filtro do relatório de Produção (período + solicitante/responsável + visibilidade por setor)
// — compartilhado entre o resumo em JSON (/api/producao) e o PDF (/api/producao/pdf), pra nunca
// divergirem.
import type { Prisma, Setor } from "@/generated/prisma/client";
import type { SessionInfo } from "@/lib/types";
import { SETORES } from "@/lib/constants";

export function parseData(v: string | null, fimDoDia: boolean): Date | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}${fimDoDia ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseSetor(v: string | null): Setor | undefined {
  return v && (SETORES as readonly string[]).includes(v) ? (v as Setor) : undefined;
}

export function buildProducaoWhere(searchParams: URLSearchParams, session: SessionInfo): Prisma.DemandaWhereInput {
  const desde = parseData(searchParams.get("desde"), false);
  const ate = parseData(searchParams.get("ate"), true);
  const setorSolicitante = parseSetor(searchParams.get("setorSolicitante"));
  const setorResponsavel = parseSetor(searchParams.get("setorResponsavel"));

  const where: Prisma.DemandaWhereInput = {};
  if (desde || ate) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = desde;
    if (ate) where.createdAt.lte = ate;
  }
  if (setorSolicitante) where.setorSolicitante = setorSolicitante;
  if (setorResponsavel) where.setorResponsavel = setorResponsavel;

  // Almoxarifado e Fundição só veem as demandas do próprio setor (que solicitaram ou que
  // atendem) — o Estoque (admin) continua vendo tudo. Combina com AND pros filtros de
  // solicitante/responsável escolhidos na tela não sobrescreverem essa visibilidade.
  if (session.role !== "ADMIN") {
    where.AND = [{ OR: [{ setorSolicitante: session.setor }, { setorResponsavel: session.setor }] }];
  }

  return where;
}

// Filtro das baixas (entregas parciais) que alimentam "Peças" na Produção — o período aqui é
// sobre a data da própria baixa (quando a peça foi de fato entregue), não a data da demanda,
// pra uma baixa dada esse mês contar nesse mês mesmo que a demanda seja antiga.
export function buildBaixasWhere(searchParams: URLSearchParams, session: SessionInfo): Prisma.ItemBaixaWhereInput {
  const desde = parseData(searchParams.get("desde"), false);
  const ate = parseData(searchParams.get("ate"), true);
  const setorSolicitante = parseSetor(searchParams.get("setorSolicitante"));
  const setorResponsavel = parseSetor(searchParams.get("setorResponsavel"));

  const where: Prisma.ItemBaixaWhereInput = {};
  if (desde || ate) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = desde;
    if (ate) where.createdAt.lte = ate;
  }

  const demandaWhere: Prisma.DemandaWhereInput = {};
  if (setorSolicitante) demandaWhere.setorSolicitante = setorSolicitante;
  if (setorResponsavel) demandaWhere.setorResponsavel = setorResponsavel;
  if (session.role !== "ADMIN") {
    demandaWhere.OR = [{ setorSolicitante: session.setor }, { setorResponsavel: session.setor }];
  }
  if (Object.keys(demandaWhere).length > 0) {
    where.item = { demanda: demandaWhere };
  }

  return where;
}
