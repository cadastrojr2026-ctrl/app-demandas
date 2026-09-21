import { prisma } from "@/lib/prisma";
import type { Setor, StatusDemanda, TipoEvento } from "@/generated/prisma/client";

/** Registra um evento no histórico de uma demanda (criação, edição, mudança de status, exclusão). */
export async function registrarEvento(params: {
  demandaId: number;
  demandaTitulo: string;
  tipo: TipoEvento;
  descricao: string;
  usuarioNome: string;
  usuarioSetor: Setor;
  demandaSetorSolicitante: Setor;
  demandaSetorResponsavel: Setor;
  // só faz sentido em eventos STATUS_ALTERADO — deixa o histórico filtrável por situação
  // resultante (ex: só o que virou Concluída ou Entregue).
  statusAnterior?: StatusDemanda;
  statusNovo?: StatusDemanda;
}) {
  await prisma.historicoEvento.create({
    data: {
      demandaId: params.demandaId,
      demandaTitulo: params.demandaTitulo,
      tipo: params.tipo,
      descricao: params.descricao,
      usuarioNome: params.usuarioNome,
      usuarioSetor: params.usuarioSetor,
      demandaSetorSolicitante: params.demandaSetorSolicitante,
      demandaSetorResponsavel: params.demandaSetorResponsavel,
      statusAnterior: params.statusAnterior,
      statusNovo: params.statusNovo,
    },
  });
}
