"use client";

import { useMemo } from "react";
import {
  SETOR_LABEL,
  SETORES_RESPONSAVEL,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  STATUS_ORDER,
} from "@/lib/constants";
import type { DemandaDTO, SessionInfo } from "@/lib/types";

export function SummaryCards({ demandas, session }: { demandas: DemandaDTO[]; session: SessionInfo }) {
  const porStatus = useMemo(() => {
    const contagem = { PENDENTE: 0, EM_ANDAMENTO: 0, CONCLUIDA: 0, CANCELADA: 0 };
    for (const d of demandas) contagem[d.status]++;
    return contagem;
  }, [demandas]);

  // Admin (Estoque) vê o card de cada setor; Almoxarifado e Fundição veem só o próprio.
  const setoresExibidos =
    session.role === "ADMIN"
      ? SETORES_RESPONSAVEL
      : SETORES_RESPONSAVEL.filter((s) => s === session.setor);

  const porSetorResponsavel = useMemo(() => {
    const contagem: Record<string, { abertas: number; total: number }> = {};
    for (const setor of SETORES_RESPONSAVEL) contagem[setor] = { abertas: 0, total: 0 };
    for (const d of demandas) {
      const c = contagem[d.setorResponsavel];
      if (!c) continue;
      c.total++;
      if (d.status === "PENDENTE" || d.status === "EM_ANDAMENTO") c.abertas++;
    }
    return contagem;
  }, [demandas]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {demandas.length}
          </p>
        </div>
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {STATUS_LABEL[status]}
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              {porStatus[status]}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {setoresExibidos.map((setor) => {
          const c = porSetorResponsavel[setor];
          return (
            <div
              key={setor}
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {SETOR_LABEL[setor]}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  demandas recebidas
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_BADGE_CLASS.PENDENTE}`}
                  title="Pendentes + em andamento"
                >
                  {c.abertas} em aberto
                </p>
                <p className="mt-1 text-xs text-zinc-400">{c.total} no total</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
