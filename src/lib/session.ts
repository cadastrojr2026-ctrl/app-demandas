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

const sessionPassword = process.env.SESSION_SECRET;
if (!sessionPassword || sessionPassword.length < 32) {
  throw new Error(
    "SESSION_SECRET ausente ou muito curta (defina uma string com 32+ caracteres no .env)"
  );
}

export const sessionOptions: SessionOptions = {
  password: sessionPassword,
  cookieName: "app-demandas-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export function isLoggedIn(session: SessionData): boolean {
  return typeof session.userId === "number";
}
