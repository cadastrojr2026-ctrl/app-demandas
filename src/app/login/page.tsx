import { redirect } from "next/navigation";
import { getSession, isLoggedIn } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (isLoggedIn(session)) redirect("/demandas");

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Demandas
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Estoque · Almoxarifado · Fundição
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
