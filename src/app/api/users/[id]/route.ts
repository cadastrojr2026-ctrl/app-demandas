import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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

const patchSchema = z
  .object({
    nome: z.string().trim().min(2, "Nome muito curto.").max(120).optional(),
    usuario: z
      .string()
      .trim()
      .min(3, "Usuário muito curto.")
      .max(40)
      .regex(/^[a-z0-9._-]+$/i, "Use apenas letras, números, ponto, hífen ou underscore.")
      .optional(),
    setor: z.enum(SETOR_VALUES).optional(),
    role: z.enum(ROLE_VALUES).optional(),
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").max(72).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nada para atualizar." });

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const alvo = await prisma.user.findUnique({ where: { id } });
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const { senha, ...resto } = parsed.data;

  // Evita que o admin tire o próprio papel de administrador (ficaria trancado fora da tela).
  if (id === auth.session.userId && resto.role && resto.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Você não pode remover seu próprio papel de administrador." },
      { status: 400 }
    );
  }

  // Garante que sempre sobra pelo menos um administrador no sistema.
  if (alvo.role === "ADMIN" && resto.role && resto.role !== "ADMIN") {
    const totalAdmins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (totalAdmins <= 1) {
      return NextResponse.json(
        { error: "Não é possível remover o único administrador do sistema." },
        { status: 400 }
      );
    }
  }

  if (resto.usuario && resto.usuario !== alvo.usuario) {
    const existente = await prisma.user.findUnique({ where: { usuario: resto.usuario } });
    if (existente) {
      return NextResponse.json({ error: "Já existe um usuário com esse login." }, { status: 409 });
    }
  }

  const data: Prisma.UserUpdateInput = { ...resto };
  if (senha) {
    data.senhaHash = await bcrypt.hash(senha, 10);
  }

  const atualizado = await prisma.user.update({
    where: { id },
    data,
    select: USER_SELECT,
  });

  return NextResponse.json({ user: atualizado });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  if (id === auth.session.userId) {
    return NextResponse.json({ error: "Você não pode excluir seu próprio usuário." }, { status: 400 });
  }

  const alvo = await prisma.user.findUnique({ where: { id } });
  if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  if (alvo.role === "ADMIN") {
    const totalAdmins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (totalAdmins <= 1) {
      return NextResponse.json(
        { error: "Não é possível excluir o único administrador do sistema." },
        { status: 400 }
      );
    }
  }

  try {
    await prisma.user.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Não é possível excluir: este usuário criou demandas. Troque o papel/senha ou remova as demandas dele antes.",
        },
        { status: 409 }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
