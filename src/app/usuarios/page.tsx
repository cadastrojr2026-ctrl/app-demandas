import { redirect } from "next/navigation";
import { getSession, isLoggedIn } from "@/lib/session";
import { UsuariosApp } from "./UsuariosApp";
import type { SessionInfo } from "@/lib/types";

export default async function UsuariosPage() {
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

  return <UsuariosApp session={sessionInfo} />;
}
