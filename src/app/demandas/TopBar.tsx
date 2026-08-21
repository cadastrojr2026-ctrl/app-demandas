"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SETOR_LABEL } from "@/lib/constants";
import type { SessionInfo } from "@/lib/types";

export function TopBar({ session }: { session: SessionInfo }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function handleLogout() {
    setSaindo(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/demandas" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JR Joias Folheadas" className="h-9 w-auto shrink-0" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
              JR Joias Folheadas
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Demandas · Estoque · Almoxarifado · Fundição
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {session.role === "ADMIN" && (
            <Link
              href="/historico"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Histórico
            </Link>
          )}
          <div className="text-right">
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{session.nome}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {SETOR_LABEL[session.setor]}
              {session.role === "ADMIN" ? " · admin" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={saindo}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
