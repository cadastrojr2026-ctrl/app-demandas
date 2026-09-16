"use client";

import {
  PRIORIDADE_BADGE_CLASS,
  PRIORIDADE_LABEL,
  PRODUTO_LABEL,
  SETOR_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
} from "@/lib/constants";
import type { DemandaDTO } from "@/lib/types";

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatarPrazo(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

// Visão completa e só-leitura de uma demanda (sem os truncamentos de linha da listagem) —
// aberta ao clicar na demanda, disponível tanto pro admin quanto pros usuários comuns.
export function DemandaDetalheModal({
  demanda,
  onClose,
  onEditar,
  onVerHistorico,
  podeEditar,
}: {
  demanda: DemandaDTO;
  onClose: () => void;
  onEditar: () => void;
  onVerHistorico: () => void;
  podeEditar: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8" onClick={onClose}>
      <div
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {demanda.titulo}
            {demanda.exemplo && (
              <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                exemplo
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[demanda.status]}`}
          >
            {STATUS_LABEL[demanda.status]}
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PRIORIDADE_BADGE_CLASS[demanda.prioridade]}`}
          >
            Prioridade {PRIORIDADE_LABEL[demanda.prioridade]}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <p className="text-zinc-500 dark:text-zinc-400">
            Solicitante
            <br />
            <span className="text-zinc-800 dark:text-zinc-200">{SETOR_LABEL[demanda.setorSolicitante]}</span>
          </p>
          <p className="text-zinc-500 dark:text-zinc-400">
            Responsável
            <br />
            <span className="text-zinc-800 dark:text-zinc-200">{SETOR_LABEL[demanda.setorResponsavel]}</span>
          </p>
          <p className="text-zinc-500 dark:text-zinc-400">
            Prazo
            <br />
            <span className="text-zinc-800 dark:text-zinc-200">
              {demanda.prazo ? formatarPrazo(demanda.prazo) : "—"}
            </span>
          </p>
          <p className="text-zinc-500 dark:text-zinc-400">
            Criado por
            <br />
            <span className="text-zinc-800 dark:text-zinc-200">
              {demanda.criadoPor.nome} em {formatarData(demanda.createdAt)}
            </span>
          </p>
        </div>

        {demanda.descricao && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Descrição
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
              {demanda.descricao}
            </p>
          </div>
        )}

        {demanda.observacao && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Observação
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">
              {demanda.observacao}
            </p>
          </div>
        )}

        {demanda.produtos.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Produtos
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {demanda.produtos.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {PRODUTO_LABEL[p]}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onVerHistorico}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Histórico
          </button>
          {podeEditar && (
            <button
              type="button"
              onClick={onEditar}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
