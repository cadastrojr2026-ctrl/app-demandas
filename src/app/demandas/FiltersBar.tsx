"use client";

import { PRIORIDADE_LABEL, PRIORIDADE_ORDER, SETOR_LABEL, SETORES, STATUS_LABEL, STATUS_ORDER } from "@/lib/constants";
import type { Prioridade, Setor, StatusDemanda } from "@/generated/prisma/client";

export interface Filters {
  status: StatusDemanda | "";
  setorResponsavel: Setor | "";
  setorSolicitante: Setor | "";
  prioridade: Prioridade | "";
  q: string;
  somenteMinhas: boolean;
}

export const FILTROS_VAZIOS: Filters = {
  status: "",
  setorResponsavel: "",
  setorSolicitante: "",
  prioridade: "",
  q: "",
  somenteMinhas: false,
};

const selectClass =
  "rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function FiltersBar({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (filters: Filters) => void;
}) {
  const ativos =
    filters.status || filters.setorResponsavel || filters.setorSolicitante || filters.prioridade || filters.q || filters.somenteMinhas;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <input
        type="text"
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
        placeholder="Buscar por título ou descrição..."
        className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />

      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value as Filters["status"] })}
        className={selectClass}
      >
        <option value="">Status: todos</option>
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <select
        value={filters.setorResponsavel}
        onChange={(e) =>
          onChange({ ...filters, setorResponsavel: e.target.value as Filters["setorResponsavel"] })
        }
        className={selectClass}
      >
        <option value="">Responsável: todos</option>
        {SETORES.map((s) => (
          <option key={s} value={s}>
            {SETOR_LABEL[s]}
          </option>
        ))}
      </select>

      <select
        value={filters.setorSolicitante}
        onChange={(e) =>
          onChange({ ...filters, setorSolicitante: e.target.value as Filters["setorSolicitante"] })
        }
        className={selectClass}
      >
        <option value="">Solicitante: todos</option>
        {SETORES.map((s) => (
          <option key={s} value={s}>
            {SETOR_LABEL[s]}
          </option>
        ))}
      </select>

      <select
        value={filters.prioridade}
        onChange={(e) => onChange({ ...filters, prioridade: e.target.value as Filters["prioridade"] })}
        className={selectClass}
      >
        <option value="">Prioridade: todas</option>
        {PRIORIDADE_ORDER.map((p) => (
          <option key={p} value={p}>
            {PRIORIDADE_LABEL[p]}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={filters.somenteMinhas}
          onChange={(e) => onChange({ ...filters, somenteMinhas: e.target.checked })}
          className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
        />
        Só as minhas
      </label>

      {ativos && (
        <button
          type="button"
          onClick={() => onChange(FILTROS_VAZIOS)}
          className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
