import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Marca uma notificação específica como lida (só o próprio destinatário pode).
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const notificacao = await prisma.notificacao.findUnique({ where: { id } });
  if (!notificacao || notificacao.paraUserId !== auth.session.userId) {
    return NextResponse.json({ error: "Notificação não encontrada." }, { status: 404 });
  }

  const atualizada = await prisma.notificacao.update({
    where: { id },
    data: { lida: true },
  });

  return NextResponse.json({ notificacao: atualizada });
}
