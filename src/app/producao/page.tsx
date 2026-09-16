import { redirect } from "next/navigation";
import { getSession, isLoggedIn } from "@/lib/session";
import { ProducaoApp } from "./ProducaoApp";
import type { SessionInfo } from "@/lib/types";

export default async function ProducaoPage() {
  const session = await getSession();
  if (!isLoggedIn(session)) redirect("/login");

  const sessionInfo: SessionInfo = {
    userId: session.userId!,
    usuario: session.usuario!,
    nome: session.nome!,
    setor: session.setor!,
    role: session.role!,
  };

  return <ProducaoApp session={sessionInfo} />;
}
