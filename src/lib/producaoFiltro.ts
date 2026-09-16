// Filtro do relatório de Produção (período + visibilidade por setor) — compartilhado entre o
// resumo em JSON (/api/producao) e o PDF (/api/producao/pdf), pra nunca divergirem.
import type { Prisma } from "@/generated/prisma/client";
import type { SessionInfo } from "@/lib/types";

export function parseData(v: string | null, fimDoDia: boolean): Date | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}${fimDoDia ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function buildProducaoWhere(searchParams: URLSearchParams, session: SessionInfo): Prisma.DemandaWhereInput {
  const desde = parseData(searchParams.get("desde"), false);
  const ate = parseData(searchParams.get("ate"), true);

  const where: Prisma.DemandaWhereInput = {};
  if (desde || ate) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = desde;
    if (ate) where.createdAt.lte = ate;
  }
  if (session.role !== "ADMIN") {
    where.OR = [{ setorSolicitante: session.setor }, { setorResponsavel: session.setor }];
  }
  return where;
}
