import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Lista as notificações do próprio usuário logado (mais recentes primeiro).
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const notificacoes = await prisma.notificacao.findMany({
    where: { paraUserId: auth.session.userId },
    orderBy: [{ createdAt: "desc" }],
    take: 50,
  });

  return NextResponse.json({ notificacoes });
}

// Limpa (apaga) todas as notificações do usuário logado.
export async function DELETE() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { count } = await prisma.notificacao.deleteMany({
    where: { paraUserId: auth.session.userId },
  });

  return NextResponse.json({ ok: true, count });
}
