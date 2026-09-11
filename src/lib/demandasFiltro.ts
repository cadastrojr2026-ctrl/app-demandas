// Monta o "where" do Prisma a partir dos filtros da URL (status, setores, prioridade, busca
// por texto, "só as minhas") — usado tanto pela listagem (/api/demandas) quanto pela geração
// do PDF (/api/demandas/pdf), para os dois nunca divergirem sobre o que é "filtrado".
import type { Prisma, Prioridade, Setor, StatusDemanda } from "@/generated/prisma/client";
import type { SessionInfo } from "@/lib/types";

const SETOR_VALUES = ["ESTOQUE", "ALMOXARIFADO", "FUNDICAO"] as const;
const STATUS_VALUES = ["PENDENTE", "EM_ANDAMENTO", "ENTREGUE", "CONCLUIDA", "CANCELADA"] as const;
const PRIORIDADE_VALUES = ["BAIXA", "MEDIA", "ALTA"] as const;

export function buildDemandasWhere(
  searchParams: URLSearchParams,
  session: SessionInfo
): Prisma.DemandaWhereInput {
  const status = searchParams.get("status");
  const setorResponsavel = searchParams.get("setorResponsavel");
  const setorSolicitante = searchParams.get("setorSolicitante");
  const prioridade = searchParams.get("prioridade");
  const q = searchParams.get("q")?.trim();
  const somenteMinhas = searchParams.get("somenteMinhas") === "1";

  const where: Prisma.DemandaWhereInput = {};
  const and: Prisma.DemandaWhereInput[] = [];

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
    where.criadoPorId = session.userId;
  }
  if (q) {
    and.push({
      OR: [{ titulo: { contains: q } }, { descricao: { contains: q } }],
    });
  }

  // Almoxarifado e Fundição só enxergam as demandas do próprio setor (que solicitaram ou que
  // são responsáveis por atender) — o Estoque (admin) continua vendo tudo.
  if (session.role !== "ADMIN") {
    and.push({
      OR: [{ setorSolicitante: session.setor }, { setorResponsavel: session.setor }],
    });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}
