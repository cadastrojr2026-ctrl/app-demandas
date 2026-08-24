"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NotificacaoDTO } from "@/lib/types";

// Intervalo de checagem — não há WebSocket no app, então usamos polling simples.
const POLL_MS = 20000;

function formatarRelativo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
}

/** Sino de notificações no app — alternativa ao WhatsApp para avisos (ex: demanda concluída). */
export function NotificationBell({ abrirParaCima = false }: { abrirParaCima?: boolean }) {
  const [notificacoes, setNotificacoes] = useState<NotificacaoDTO[]>([]);
  const [aberto, setAberto] = useState(false);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/notificacoes");
      if (!res.ok) return;
      const data = await res.json();
      setNotificacoes(data.notificacoes);
    } catch {
      // silencioso — checagem falhou, tenta de novo no próximo ciclo
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
    const intervalo = setInterval(carregar, POLL_MS);
    function aoFocar() {
      carregar();
    }
    window.addEventListener("focus", aoFocar);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener("focus", aoFocar);
    };
  }, [carregar]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  async function marcarUma(id: number) {
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
    try {
      await fetch(`/api/notificacoes/${id}`, { method: "PATCH" });
    } catch {
      // se falhar, o próximo polling corrige o estado
    }
  }

  async function marcarTodas() {
    if (naoLidas === 0) return;
    setMarcandoTodas(true);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    try {
      await fetch("/api/notificacoes/marcar-lidas", { method: "POST" });
    } finally {
      setMarcandoTodas(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-base hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <span aria-hidden="true">🔔</span>
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          className={`absolute right-0 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950 ${
            abrirParaCima ? "bottom-11" : "top-11"
          }`}
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Notificações</p>
            {naoLidas > 0 && (
              <button
                type="button"
                onClick={marcarTodas}
                disabled={marcandoTodas}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Nenhuma notificação.
              </p>
            ) : (
              notificacoes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => !n.lida && marcarUma(n.id)}
                  className={`block w-full border-b border-zinc-100 px-3 py-2.5 text-left text-sm last:border-0 dark:border-zinc-900 ${
                    n.lida
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "bg-zinc-50 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  <p>{n.mensagem}</p>
                  <p className="mt-0.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">
                    {formatarRelativo(n.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
