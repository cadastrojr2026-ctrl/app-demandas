import { redirect } from "next/navigation";
import { getSession, isLoggedIn } from "@/lib/session";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (isLoggedIn(session)) redirect("/demandas");

  return (
    <div className="relative flex flex-1 items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JR Joias Folheadas" className="h-16 w-auto" />
          <h1 className="mt-3 text-lg font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
            JR Joias Folheadas
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Demandas · Estoque · Almoxarifado · Fundição
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
