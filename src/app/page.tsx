import { redirect } from "next/navigation";
import { getSession, isLoggedIn } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  redirect(isLoggedIn(session) ? "/demandas" : "/login");
}
