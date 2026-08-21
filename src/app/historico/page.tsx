import { redirect } from "next/navigation";
import { getSession, isLoggedIn } from "@/lib/session";
import { HistoricoApp } from "./HistoricoApp";
import type { SessionInfo } from "@/lib/types";

export default async function HistoricoPage() {
  const session = await getSession();
  if (!isLoggedIn(session)) redirect("/login");
  if (session.role !== "ADMIN") redirect("/demandas");

  const sessionInfo: SessionInfo = {
    userId: session.userId!,
    usuario: session.usuario!,
    nome: session.nome!,
    setor: session.setor!,
    role: session.role!,
  };

  return <HistoricoApp session={sessionInfo} />;
}
