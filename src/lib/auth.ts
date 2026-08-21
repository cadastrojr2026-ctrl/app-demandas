import { NextResponse } from "next/server";
import { getSession, type SessionData } from "@/lib/session";

type AuthSuccess = { session: Required<Pick<SessionData, "userId" | "usuario" | "nome" | "setor" | "role">> };
type AuthFailure = { error: NextResponse };

/** Garante que existe um usuário autenticado. Use nas rotas de API. */
export async function requireUser(): Promise<AuthSuccess | AuthFailure> {
  const session = await getSession();
  if (!session.userId || !session.setor || !session.role || !session.usuario || !session.nome) {
    return { error: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return {
    session: {
      userId: session.userId,
      usuario: session.usuario,
      nome: session.nome,
      setor: session.setor,
      role: session.role,
    },
  };
}

/** Garante que existe um usuário autenticado com papel ADMIN. */
export async function requireAdmin(): Promise<AuthSuccess | AuthFailure> {
  const result = await requireUser();
  if ("error" in result) return result;
  if (result.session.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Ação restrita ao administrador." }, { status: 403 }) };
  }
  return result;
}
