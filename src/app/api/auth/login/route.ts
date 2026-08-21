import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const loginSchema = z.object({
  usuario: z.string().trim().min(1, "Informe o usuário."),
  senha: z.string().min(1, "Informe a senha."),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Usuário e senha são obrigatórios." }, { status: 400 });
  }

  const { usuario, senha } = parsed.data;

  const user = await prisma.user.findUnique({ where: { usuario } });
  if (!user) {
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const senhaOk = await bcrypt.compare(senha, user.senhaHash);
  if (!senhaOk) {
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }

  const session = await getSession();
  session.userId = user.id;
  session.usuario = user.usuario;
  session.nome = user.nome;
  session.setor = user.setor;
  session.role = user.role;
  await session.save();

  return NextResponse.json({
    usuario: user.usuario,
    nome: user.nome,
    setor: user.setor,
    role: user.role,
  });
}
