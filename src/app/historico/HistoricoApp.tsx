"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { TIPO_EVENTO_BADGE_CLASS, TIPO_EVENTO_LABEL } from "@/lib/constants";
import type { HistoricoEventoDTO, SessionInfo } from "@/lib/types";
import type { TipoEvento } from "@/generated/prisma/client";

const TIPO_ORDER: TipoEvento[] = ["CRIADA", "EDITADA", "STATUS_ALTERADO", "EXCLUIDA"];

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function HistoricoApp({ session }: { session: SessionInfo }) {
  const [eventos, setEventos] = useState<HistoricoEventoDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoEvento | "">("");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const res = await fetch("/api/historico");
        if (!res.ok) throw new Error("Falha ao carregar histórico.");
        const data = await res.json();
        setEventos(data.eventos);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro desconhecido.");
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const filtrados = useMemo(() => {
    return eventos.filter((ev) => {
      if (tipo && ev.tipo !== tipo) return false;
      if (q) {
        const termo = q.toLowerCase();
        const alvo = `${ev.demandaTitulo} ${ev.descricao}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [eventos, tipo, q]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black md:flex-row">
      <Sidebar session={session} />

      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Histórico de demandas
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Registro de criação, edição, mudança de situação e exclusão de demandas.
            </p>
          </div>
          <Link
            href="/demandas"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            ← Voltar para demandas
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por demanda ou descrição do evento..."
            className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoEvento | "")}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Tipo: todos</option>
            {TIPO_ORDER.map((t) => (
              <option key={t} value={t}>
                {TIPO_EVENTO_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        {carregando ? (
          <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Carregando...</p>
        ) : erro ? (
          <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">{erro}</p>
        ) : filtrados.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
            Nenhum evento encontrado.
          </div>
        ) : (
          <>
            {/* Cartões: telas pequenas */}
            <div className="flex flex-col gap-3 md:hidden">
              {filtrados.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {ev.demandaTitulo}
                      {ev.exemplo && (
                        <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          exemplo
                        </span>
                      )}
                    </p>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_EVENTO_BADGE_CLASS[ev.tipo]}`}
                    >
                      {TIPO_EVENTO_LABEL[ev.tipo]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{formatarData(ev.createdAt)}</p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{ev.descricao}</p>
                </div>
              ))}
            </div>

            {/* Tabela: telas médias e maiores */}
            <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:block">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Demanda</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((ev) => (
                  <tr
                    key={ev.id}
                    className="border-b border-zinc-100 align-top last:border-0 dark:border-zinc-900"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatarData(ev.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {ev.demandaTitulo}
                      {ev.exemplo && (
                        <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          exemplo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_EVENTO_BADGE_CLASS[ev.tipo]}`}
                      >
                        {TIPO_EVENTO_LABEL[ev.tipo]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{ev.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
