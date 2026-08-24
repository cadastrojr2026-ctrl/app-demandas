import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Marca todas as notificações não lidas do usuário logado como lidas de uma vez.
export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { count } = await prisma.notificacao.updateMany({
    where: { paraUserId: auth.session.userId, lida: false },
    data: { lida: true },
  });

  return NextResponse.json({ ok: true, count });
}
