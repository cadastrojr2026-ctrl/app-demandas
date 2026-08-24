"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { SETOR_LABEL } from "@/lib/constants";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import type { SessionInfo } from "@/lib/types";

const LINKS = [
  { href: "/demandas", label: "Demandas", adminOnly: false },
  { href: "/historico", label: "Histórico", adminOnly: true },
  { href: "/usuarios", label: "Usuários", adminOnly: true },
] as const;

export function Sidebar({ session }: { session: SessionInfo }) {
  const router = useRouter();
  const pathname = usePathname();
  const [saindo, setSaindo] = useState(false);
  const [aberto, setAberto] = useState(false);

  async function handleLogout() {
    setSaindo(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = LINKS.filter((l) => !l.adminOnly || session.role === "ADMIN");

  return (
    <>
      {/* Barra superior, só em telas pequenas */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-lg text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <Link href="/demandas" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JR Joias Folheadas" className="h-7 w-auto shrink-0" />
          <span className="text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
            JR Joias
          </span>
        </Link>
        <div className="flex items-center gap-2">
          {session.role === "ADMIN" && <NotificationBell />}
          <ThemeToggle />
        </div>
      </div>

      {/* Fundo escurecido atrás do menu, só quando aberto no mobile */}
      {aberto && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setAberto(false)}
          aria-hidden="true"
        />
      )}

      {/* Menu lateral: painel deslizante no mobile, fixo à esquerda em telas maiores */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out dark:border-zinc-800 dark:bg-zinc-950 md:sticky md:top-0 md:z-0 md:h-screen md:translate-x-0 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link
          href="/demandas"
          onClick={() => setAberto(false)}
          className="flex items-center gap-3 px-4 py-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="JR Joias Folheadas" className="h-9 w-auto shrink-0" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-50">
              JR Joias Folheadas
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Estoque · Almoxarifado · Fundição
            </p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          {links.map((l) => {
            const ativo = pathname === l.href || pathname?.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setAberto(false)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  ativo
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {session.nome}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {SETOR_LABEL[session.setor]}
                {session.role === "ADMIN" ? " · admin" : ""}
              </p>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {session.role === "ADMIN" && <NotificationBell abrirParaCima />}
              <ThemeToggle />
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={saindo}
            className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
