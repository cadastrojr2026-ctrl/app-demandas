import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Gestão de usuários — restrita ao administrador (Estoque).

const SETOR_VALUES = ["ESTOQUE", "ALMOXARIFADO", "FUNDICAO"] as const;
const ROLE_VALUES = ["ADMIN", "USER"] as const;

const USER_SELECT = {
  id: true,
  nome: true,
  usuario: true,
  setor: true,
  role: true,
  createdAt: true,
} as const;

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const users = await prisma.user.findMany({
    orderBy: [{ nome: "asc" }],
    select: USER_SELECT,
  });

  return NextResponse.json({ users });
}

const createSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto.").max(120),
  usuario: z
    .string()
    .trim()
    .min(3, "Usuário muito curto.")
    .max(40)
    .regex(/^[a-z0-9._-]+$/i, "Use apenas letras, números, ponto, hífen ou underscore."),
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").max(72),
  setor: z.enum(SETOR_VALUES),
  role: z.enum(ROLE_VALUES),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const { nome, usuario, senha, setor, role } = parsed.data;

  const existente = await prisma.user.findUnique({ where: { usuario } });
  if (existente) {
    return NextResponse.json({ error: "Já existe um usuário com esse login." }, { status: 409 });
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const user = await prisma.user.create({
    data: { nome, usuario, senhaHash, setor, role },
    select: USER_SELECT,
  });

  return NextResponse.json({ user }, { status: 201 });
}
