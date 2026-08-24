import { prisma } from "@/lib/prisma";
import type { Prisma, Setor } from "@/generated/prisma/client";

interface NotificarParams {
  mensagem: string;
  demandaId?: number;
  demandaTitulo?: string;
  /** Não notifica esse usuário (ex: o próprio autor da ação). */
  excluirUserId?: number;
}

async function notificarUsuarios(where: Prisma.UserWhereInput, params: NotificarParams) {
  const usuarios = await prisma.user.findMany({ where, select: { id: true } });
  if (usuarios.length === 0) return;

  await prisma.notificacao.createMany({
    data: usuarios.map((usuario) => ({
      paraUserId: usuario.id,
      mensagem: params.mensagem,
      demandaId: params.demandaId ?? null,
      demandaTitulo: params.demandaTitulo ?? null,
    })),
  });
}

/**
 * Cria uma notificação dentro do próprio app para todos os usuários ADMIN — alternativa ao
 * WhatsApp para quem ainda não configurou nenhum provedor (veja src/lib/whatsapp.ts).
 */
export async function notificarAdmins(params: NotificarParams) {
  return notificarUsuarios(
    {
      role: "ADMIN",
      ...(params.excluirUserId ? { id: { not: params.excluirUserId } } : {}),
    },
    params
  );
}

/**
 * Notifica todos os usuários de um setor (ex: "vocês receberam uma nova demanda") — usado
 * quando uma demanda é criada ou reatribuída para esse setor.
 */
export async function notificarSetor(setor: Setor, params: NotificarParams) {
  return notificarUsuarios(
    {
      setor,
      ...(params.excluirUserId ? { id: { not: params.excluirUserId } } : {}),
    },
    params
  );
}
