"use client";

import { useEffect, useState } from "react";
import { TIPO_EVENTO_BADGE_CLASS, TIPO_EVENTO_LABEL } from "@/lib/constants";
import type { DemandaDTO, HistoricoEventoDTO } from "@/lib/types";

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function HistoricoDemandaModal({ demanda, onClose }: { demanda: DemandaDTO; onClose: () => void }) {
  const [eventos, setEventos] = useState<HistoricoEventoDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const res = await fetch(`/api/historico?demandaId=${demanda.id}`);
        if (!res.ok) throw new Error("Falha ao carregar histórico.");
        const data = await res.json();
        setEventos(data.eventos);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro desconhecido.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [demanda.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">Histórico da demanda</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{demanda.titulo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Fechar
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto">
          {carregando ? (
            <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Carregando...</p>
          ) : erro ? (
            <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">{erro}</p>
          ) : eventos.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Nenhum evento registrado para esta demanda.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {eventos.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_EVENTO_BADGE_CLASS[ev.tipo]}`}
                    >
                      {TIPO_EVENTO_LABEL[ev.tipo]}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatarData(ev.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-zinc-700 dark:text-zinc-300">{ev.descricao}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
