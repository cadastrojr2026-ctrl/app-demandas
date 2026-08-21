import { prisma } from "@/lib/prisma";
import type { Setor, TipoEvento } from "@/generated/prisma/client";

/** Registra um evento no histórico de uma demanda (criação, edição, mudança de status, exclusão). */
export async function registrarEvento(params: {
  demandaId: number;
  demandaTitulo: string;
  tipo: TipoEvento;
  descricao: string;
  usuarioNome: string;
  usuarioSetor: Setor;
}) {
  await prisma.historicoEvento.create({
    data: {
      demandaId: params.demandaId,
      demandaTitulo: params.demandaTitulo,
      tipo: params.tipo,
      descricao: params.descricao,
      usuarioNome: params.usuarioNome,
      usuarioSetor: params.usuarioSetor,
    },
  });
}
