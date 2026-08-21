import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import type { Role, Setor } from "@/generated/prisma/client";

export interface SessionData {
  userId?: number;
  usuario?: string;
  nome?: string;
  setor?: Setor;
  role?: Role;
}

// A validação só roda quando a sessão é realmente usada (dentro de getSession), nunca
// no carregamento do módulo — o build da Vercel carrega as rotas para inspecioná-las, e se
// essa checagem rodasse aqui em cima, faltar a variável nesse momento derrubaria o build inteiro.
function getSessionOptions(): SessionOptions {
  const sessionPassword = process.env.SESSION_SECRET;
  if (!sessionPassword || sessionPassword.length < 32) {
    throw new Error(
      "SESSION_SECRET ausente ou muito curta (defina uma string com 32+ caracteres no .env)"
    );
  }
  return {
    password: sessionPassword,
    cookieName: "app-demandas-session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

export function isLoggedIn(session: SessionData): boolean {
  return typeof session.userId === "number";
}
