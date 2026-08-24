"use client";

import { useState } from "react";
import {
  PRIORIDADE_BADGE_CLASS,
  PRIORIDADE_LABEL,
  PRODUTO_LABEL,
  SETOR_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  STATUS_ORDER,
} from "@/lib/constants";
import type { DemandaDTO, SessionInfo } from "@/lib/types";
import type { StatusDemanda } from "@/generated/prisma/client";

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatarPrazo(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

function prazoVencido(d: DemandaDTO) {
  if (!d.prazo) return false;
  if (d.status === "CONCLUIDA" || d.status === "CANCELADA") return false;
  return new Date(d.prazo).getTime() < Date.now();
}

export function DemandasTable({
  demandas,
  session,
  onEdit,
  onDelete,
  onChangeStatus,
  onVerHistorico,
}: {
  demandas: DemandaDTO[];
  session: SessionInfo;
  onEdit: (demanda: DemandaDTO) => void;
  onDelete: (demanda: DemandaDTO) => void;
  onChangeStatus: (demanda: DemandaDTO, status: StatusDemanda) => Promise<void>;
  onVerHistorico: (demanda: DemandaDTO) => void;
}) {
  const [alterandoId, setAlterandoId] = useState<number | null>(null);

  if (demandas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        Nenhuma demanda encontrada com os filtros atuais.
      </div>
    );
  }

  return (
    <>
      {/* Cartões: telas pequenas */}
      <div className="flex flex-col gap-3 md:hidden">
        {demandas.map((d) => {
          const isAdmin = session.role === "ADMIN";
          const isCriador = d.criadoPorId === session.userId;
          const isResponsavel = d.setorResponsavel === session.setor;
          const canEditFull = isAdmin || isCriador;
          const canChangeStatus = canEditFull || isResponsavel;
          const canDelete = isAdmin;

          return (
            <div
              key={d.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {d.titulo}
                  {d.exemplo && (
                    <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      exemplo
                    </span>
                  )}
                </p>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDADE_BADGE_CLASS[d.prioridade]}`}
                >
                  {PRIORIDADE_LABEL[d.prioridade]}
                </span>
              </div>

              {d.descricao && (
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {d.descricao}
                </p>
              )}

              {d.produtos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {d.produtos.map((p) => (
                    <span
                      key={p}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {PRODUTO_LABEL[p]}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <p>
                  Solicitante: <span className="text-zinc-700 dark:text-zinc-300">{SETOR_LABEL[d.setorSolicitante]}</span>
                </p>
                <p>
                  Responsável: <span className="text-zinc-700 dark:text-zinc-300">{SETOR_LABEL[d.setorResponsavel]}</span>
                </p>
                <p>
                  Prazo:{" "}
                  {d.prazo ? (
                    <span
                      className={
                        prazoVencido(d)
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "text-zinc-700 dark:text-zinc-300"
                      }
                    >
                      {formatarPrazo(d.prazo)}
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-600">—</span>
                  )}
                </p>
                <p>
                  Criado por: <span className="text-zinc-700 dark:text-zinc-300">{d.criadoPor.nome}</span>
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <select
                  value={d.status}
                  disabled={!canChangeStatus || alterandoId === d.id}
                  onChange={async (e) => {
                    const novo = e.target.value as StatusDemanda;
                    setAlterandoId(d.id);
                    await onChangeStatus(d, novo);
                    setAlterandoId(null);
                  }}
                  className={`rounded-full border-0 px-2 py-1 text-xs font-medium outline-none disabled:cursor-not-allowed disabled:opacity-70 ${STATUS_BADGE_CLASS[d.status]}`}
                  title={canChangeStatus ? "Alterar situação" : "Você não pode alterar esta demanda"}
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onVerHistorico(d)}
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Histórico
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(d)}
                    disabled={!canEditFull}
                    className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(d)}
                    disabled={!canDelete}
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela: telas médias e maiores */}
      <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:block">
      <table className="w-full min-w-[960px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th className="px-4 py-3 font-medium">Demanda</th>
            <th className="px-4 py-3 font-medium">Solicitante</th>
            <th className="px-4 py-3 font-medium">Responsável</th>
            <th className="px-4 py-3 font-medium">Prioridade</th>
            <th className="px-4 py-3 font-medium">Prazo</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Criado por / em</th>
            <th className="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {demandas.map((d) => {
            const isAdmin = session.role === "ADMIN";
            const isCriador = d.criadoPorId === session.userId;
            const isResponsavel = d.setorResponsavel === session.setor;
            const canEditFull = isAdmin || isCriador;
            const canChangeStatus = canEditFull || isResponsavel;
            const canDelete = isAdmin;

            return (
              <tr
                key={d.id}
                className="border-b border-zinc-100 align-top last:border-0 dark:border-zinc-900"
              >
                <td className="max-w-xs px-4 py-3">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {d.titulo}
                    {d.exemplo && (
                      <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        exemplo
                      </span>
                    )}
                  </p>
                  {d.descricao && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                      {d.descricao}
                    </p>
                  )}
                  {d.produtos.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {d.produtos.map((p) => (
                        <span
                          key={p}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {PRODUTO_LABEL[p]}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {SETOR_LABEL[d.setorSolicitante]}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {SETOR_LABEL[d.setorResponsavel]}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PRIORIDADE_BADGE_CLASS[d.prioridade]}`}
                  >
                    {PRIORIDADE_LABEL[d.prioridade]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {d.prazo ? (
                    <span
                      className={
                        prazoVencido(d)
                          ? "font-medium text-red-600 dark:text-red-400"
                          : "text-zinc-600 dark:text-zinc-300"
                      }
                      title={prazoVencido(d) ? "Prazo vencido" : undefined}
                    >
                      {formatarPrazo(d.prazo)}
                    </span>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={d.status}
                    disabled={!canChangeStatus || alterandoId === d.id}
                    onChange={async (e) => {
                      const novo = e.target.value as StatusDemanda;
                      setAlterandoId(d.id);
                      await onChangeStatus(d, novo);
                      setAlterandoId(null);
                    }}
                    className={`rounded-full border-0 px-2 py-1 text-xs font-medium outline-none disabled:cursor-not-allowed disabled:opacity-70 ${STATUS_BADGE_CLASS[d.status]}`}
                    title={canChangeStatus ? "Alterar situação" : "Você não pode alterar esta demanda"}
                  >
                    {STATUS_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                  <p>{d.criadoPor.nome}</p>
                  <p>{formatarData(d.createdAt)}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onVerHistorico(d)}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Histórico
                    </button>
                    <button
                      type="button"
                      onClick={() => onEdit(d)}
                      disabled={!canEditFull}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(d)}
                      disabled={!canDelete}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
