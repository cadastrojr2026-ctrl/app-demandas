// Filtro do relatório de Produção (período + setor + visibilidade por setor) — compartilhado
// entre o resumo em JSON (/api/producao) e o PDF (/api/producao/pdf), pra nunca divergirem.
import type { Prisma, Setor } from "@/generated/prisma/client";
import type { SessionInfo } from "@/lib/types";
import { SETORES } from "@/lib/constants";

export function parseData(v: string | null, fimDoDia: boolean): Date | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}${fimDoDia ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function buildProducaoWhere(searchParams: URLSearchParams, session: SessionInfo): Prisma.DemandaWhereInput {
  const desde = parseData(searchParams.get("desde"), false);
  const ate = parseData(searchParams.get("ate"), true);
  const setorParam = searchParams.get("setor");
  const setor = (setorParam && (SETORES as readonly string[]).includes(setorParam) ? setorParam : undefined) as
    | Setor
    | undefined;

  const where: Prisma.DemandaWhereInput = {};
  if (desde || ate) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = desde;
    if (ate) where.createdAt.lte = ate;
  }

  // Cada condição de setor (visibilidade do usuário + filtro escolhido na tela) é um OR entre
  // solicitante/responsável — combinadas com AND pra não uma sobrescrever a outra.
  const condicoesSetor: Prisma.DemandaWhereInput[] = [];
  if (session.role !== "ADMIN") {
    condicoesSetor.push({ OR: [{ setorSolicitante: session.setor }, { setorResponsavel: session.setor }] });
  }
  if (setor) {
    condicoesSetor.push({ OR: [{ setorSolicitante: setor }, { setorResponsavel: setor }] });
  }
  if (condicoesSetor.length > 0) {
    where.AND = condicoesSetor;
  }

  return where;
}
