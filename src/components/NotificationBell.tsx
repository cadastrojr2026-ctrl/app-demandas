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

// AudioContext compartilhado entre montagens do componente — navegadores só liberam áudio
// programático depois de algum gesto do usuário na página (clique, toque etc). Criamos um
// único contexto e o "destravamos" no primeiro gesto, pra já estar pronto quando a primeira
// notificação nova chegar via polling (que não é, em si, um gesto do usuário).
let audioCtx: AudioContext | null = null;
let audioDestravado = false;

function destravarAudio() {
  if (audioDestravado) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    audioDestravado = true;
  } catch {
    // sem suporte a Web Audio — o app segue funcionando normalmente, só sem som
  }
}

function tocarBeep() {
  try {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch {
    // se falhar, só não toca — não deve quebrar o resto do app
  }
}

/** Sino de notificações no app — alternativa ao WhatsApp para avisos (ex: demanda concluída). */
export function NotificationBell({ abrirParaCima = false }: { abrirParaCima?: boolean }) {
  const [notificacoes, setNotificacoes] = useState<NotificacaoDTO[]>([]);
  const [aberto, setAberto] = useState(false);
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const idsConhecidosRef = useRef<Set<number> | null>(null);

  const carregar = useCallback(async () => {
    try {
      const res = await fetch("/api/notificacoes");
      if (!res.ok) return;
      const data = await res.json();
      const novas = data.notificacoes as NotificacaoDTO[];

      // Detecta notificações novas (ids ainda não vistos) desde a última checagem — não
      // dispara som/pop-up na primeira carga da página, só nas seguintes.
      if (idsConhecidosRef.current) {
        const idsNovos = novas.filter((n) => !n.lida && !idsConhecidosRef.current!.has(n.id));
        if (idsNovos.length > 0) {
          tocarBeep();
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              const texto =
                idsNovos.length === 1
                  ? idsNovos[0].mensagem
                  : `${idsNovos.length} novas notificações`;
              new Notification("Demandas JR", { body: texto, tag: "demandas-jr" });
            } catch {
              // navegador pode bloquear em alguns contextos (ex: iOS Safari fora do PWA instalado)
            }
          }
        }
      }
      idsConhecidosRef.current = new Set(novas.map((n) => n.id));
      setNotificacoes(novas);
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

  // Pede permissão de notificação do navegador e destrava o áudio no primeiro gesto do
  // usuário na página (clique/toque em qualquer lugar) — assim já fica pronto quando a
  // primeira notificação real chegar.
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    function aoGesto() {
      destravarAudio();
    }
    document.addEventListener("pointerdown", aoGesto, { once: true });
    return () => document.removeEventListener("pointerdown", aoGesto);
  }, []);

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

  async function removerUma(id: number) {
    setNotificacoes((prev) => prev.filter((n) => n.id !== id));
    try {
      await fetch(`/api/notificacoes/${id}`, { method: "DELETE" });
    } catch {
      // se falhar, o próximo polling corrige o estado
    }
  }

  async function limparTudo() {
    if (notificacoes.length === 0) return;
    setLimpando(true);
    setNotificacoes([]);
    try {
      await fetch("/api/notificacoes", { method: "DELETE" });
    } finally {
      setLimpando(false);
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
          <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Notificações</p>
            <div className="flex items-center gap-2">
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
              {notificacoes.length > 0 && (
                <button
                  type="button"
                  onClick={limparTudo}
                  disabled={limpando}
                  className="text-xs font-medium text-zinc-500 hover:text-red-600 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-red-400"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                Nenhuma notificação.
              </p>
            ) : (
              notificacoes.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2 border-b border-zinc-100 px-3 py-2.5 text-left text-sm last:border-0 dark:border-zinc-900 ${
                    n.lida
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "bg-zinc-50 font-medium text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => !n.lida && marcarUma(n.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p>{n.mensagem}</p>
                    <p className="mt-0.5 text-xs font-normal text-zinc-400 dark:text-zinc-500">
                      {formatarRelativo(n.createdAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => removerUma(n.id)}
                    aria-label="Remover notificação"
                    title="Remover"
                    className="shrink-0 rounded px-1 text-base leading-none text-zinc-300 hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-400"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
