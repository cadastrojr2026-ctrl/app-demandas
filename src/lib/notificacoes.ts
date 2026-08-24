import { prisma } from "@/lib/prisma";

/**
 * Cria uma notificação dentro do próprio app para todos os usuários ADMIN — alternativa ao
 * WhatsApp para quem ainda não configurou nenhum provedor (veja src/lib/whatsapp.ts).
 */
export async function notificarAdmins(params: {
  mensagem: string;
  demandaId?: number;
  demandaTitulo?: string;
  /** Não notifica esse usuário (ex: o próprio admin que fez a ação). */
  excluirUserId?: number;
}) {
  const admins = await prisma.user.findMany({
    where: {
      role: "ADMIN",
      ...(params.excluirUserId ? { id: { not: params.excluirUserId } } : {}),
    },
    select: { id: true },
  });
  if (admins.length === 0) return;

  await prisma.notificacao.createMany({
    data: admins.map((admin) => ({
      paraUserId: admin.id,
      mensagem: params.mensagem,
      demandaId: params.demandaId ?? null,
      demandaTitulo: params.demandaTitulo ?? null,
    })),
  });
}
