"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [escuro, setEscuro] = useState<boolean | null>(null);

  useEffect(() => {
    // Lê o tema aplicado pelo ThemeInitScript (que roda antes da hidratação). Só existe no
    // cliente, por isso não dá pra inicializar o estado direto — precisa ler após montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const novo = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem("tema", novo ? "dark" : "light");
    } catch {
      // localStorage indisponível (ex: navegação privada) — só não persiste a escolha.
    }
    setEscuro(novo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-base hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
    >
      <span aria-hidden="true">{escuro === null ? "" : escuro ? "☀️" : "🌙"}</span>
    </button>
  );
}
