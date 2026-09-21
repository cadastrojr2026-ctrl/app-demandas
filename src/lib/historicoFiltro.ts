// Filtro do histórico (período, setor de quem fez, situação resultante da mudança de status,
// visibilidade por setor) — compartilhado entre a listagem em JSON (/api/historico) e o PDF
// (/api/historico/pdf), pra nunca divergirem.
import type { Prisma } from "@/generated/prisma/client";
import type { SessionInfo } from "@/lib/types";

const SETOR_VALUES = ["ESTOQUE", "ALMOXARIFADO", "FUNDICAO"] as const;
const STATUS_VALUES = ["PENDENTE", "EM_ANDAMENTO", "ENTREGUE", "CONCLUIDA", "CANCELADA"] as const;
const TIPO_VALUES = ["CRIADA", "EDITADA", "STATUS_ALTERADO", "EXCLUIDA"] as const;

export function parseData(v: string | null, fimDoDia: boolean): Date | undefined {
  if (!v) return undefined;
  const d = new Date(`${v}${fimDoDia ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function buildHistoricoWhere(
  searchParams: URLSearchParams,
  session: SessionInfo
): Prisma.HistoricoEventoWhereInput {
  const desde = parseData(searchParams.get("desde"), false);
  const ate = parseData(searchParams.get("ate"), true);
  const setor = searchParams.get("setor");
  const tipo = searchParams.get("tipo");
  const statusNovoValores = searchParams
    .getAll("statusNovo")
    .filter((v): v is (typeof STATUS_VALUES)[number] => (STATUS_VALUES as readonly string[]).includes(v));

  const where: Prisma.HistoricoEventoWhereInput = {};
  if (desde || ate) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = desde;
    if (ate) where.createdAt.lte = ate;
  }
  if (setor && (SETOR_VALUES as readonly string[]).includes(setor)) {
    where.usuarioSetor = setor as (typeof SETOR_VALUES)[number];
  }
  if (tipo && (TIPO_VALUES as readonly string[]).includes(tipo)) {
    where.tipo = tipo as (typeof TIPO_VALUES)[number];
  }
  if (statusNovoValores.length > 0) {
    where.statusNovo = { in: statusNovoValores };
  }

  // Almoxarifado e Fundição só veem o histórico das demandas do próprio setor (que
  // solicitaram ou que são responsáveis por atender) — o Estoque (admin) continua vendo tudo.
  if (session.role !== "ADMIN") {
    where.OR = [
      { demandaSetorSolicitante: session.setor },
      { demandaSetorResponsavel: session.setor },
    ];
  }

  return where;
}
