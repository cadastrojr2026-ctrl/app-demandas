"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { DemandaDetalheModal } from "@/app/demandas/DemandaDetalheModal";
import { DemandaFormModal } from "@/app/demandas/DemandaFormModal";
import {
  SETOR_LABEL,
  SETORES,
  TIPO_EVENTO_BADGE_CLASS,
  TIPO_EVENTO_LABEL,
} from "@/lib/constants";
import type { DemandaDTO, HistoricoEventoDTO, SessionInfo } from "@/lib/types";
import type { Setor, TipoEvento } from "@/generated/prisma/client";

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

const selectClass =
  "rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function HistoricoApp({ session }: { session: SessionInfo }) {
  const [eventos, setEventos] = useState<HistoricoEventoDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [proximoCursor, setProximoCursor] = useState<number | null>(null);

  const [tipo, setTipo] = useState<TipoEvento | "">("");
  const [q, setQ] = useState("");
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");
  const [setor, setSetor] = useState<Setor | "">("");
  const [somenteConcluidasEntregues, setSomenteConcluidasEntregues] = useState(false);
  // Depois de abrir uma demanda pelo histórico e clicar em "Histórico" lá dentro, volta aqui
  // filtrado só pros eventos daquela demanda — não precisa buscar de novo, já está tudo
  // carregado.
  const [filtroDemandaId, setFiltroDemandaId] = useState<number | null>(null);

  const [demandaSelecionada, setDemandaSelecionada] = useState<DemandaDTO | null>(null);
  const [carregandoDemanda, setCarregandoDemanda] = useState(false);
  const [avisoDemanda, setAvisoDemanda] = useState<string | null>(null);
  const [demandaParaEditar, setDemandaParaEditar] = useState<DemandaDTO | null>(null);

  const construirQuery = useCallback(
    (cursor?: number | null) => {
      const params = new URLSearchParams();
      if (desde) params.set("desde", desde);
      if (ate) params.set("ate", ate);
      if (setor) params.set("setor", setor);
      if (somenteConcluidasEntregues) {
        params.append("statusNovo", "CONCLUIDA");
        params.append("statusNovo", "ENTREGUE");
      }
      if (cursor) params.set("cursor", String(cursor));
      return params.toString();
    },
    [desde, ate, setor, somenteConcluidasEntregues]
  );

  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro(null);
      setFiltroDemandaId(null);
      try {
        const query = construirQuery();
        const res = await fetch(`/api/historico${query ? `?${query}` : ""}`);
        if (!res.ok) throw new Error("Falha ao carregar histórico.");
        const data = await res.json();
        setEventos(data.eventos);
        setProximoCursor(data.proximoCursor ?? null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro desconhecido.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [construirQuery]);

  async function carregarMais() {
    if (!proximoCursor) return;
    setCarregandoMais(true);
    try {
      const query = construirQuery(proximoCursor);
      const res = await fetch(`/api/historico?${query}`);
      if (!res.ok) throw new Error("Falha ao carregar mais eventos.");
      const data = await res.json();
      setEventos((prev) => [...prev, ...data.eventos]);
      setProximoCursor(data.proximoCursor ?? null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setCarregandoMais(false);
    }
  }

  function handleGerarPdf() {
    window.open(`/api/historico/pdf?${construirQuery()}`, "_blank");
  }

  async function abrirDemanda(demandaId: number) {
    setAvisoDemanda(null);
    setCarregandoDemanda(true);
    try {
      const res = await fetch(`/api/demandas/${demandaId}`);
      const data = await res.json();
      if (!res.ok) {
        setAvisoDemanda(
          res.status === 404
            ? "Essa demanda foi excluída — só o registro no histórico continua disponível."
            : data.error ?? "Não foi possível abrir a demanda."
        );
        return;
      }
      setDemandaSelecionada(data.demanda);
    } catch {
      setAvisoDemanda("Erro de conexão. Tente novamente.");
    } finally {
      setCarregandoDemanda(false);
    }
  }

  useEffect(() => {
    if (!avisoDemanda) return;
    const t = setTimeout(() => setAvisoDemanda(null), 5000);
    return () => clearTimeout(t);
  }, [avisoDemanda]);

  const filtrados = useMemo(() => {
    return eventos.filter((ev) => {
      if (filtroDemandaId && ev.demandaId !== filtroDemandaId) return false;
      if (tipo && ev.tipo !== tipo) return false;
      if (q) {
        const termo = q.toLowerCase();
        const alvo = `${ev.demandaTitulo} ${ev.descricao}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [eventos, tipo, q, filtroDemandaId]);

  const isAdmin = session.role === "ADMIN";
  const podeEditarSelecionada =
    !!demandaSelecionada &&
    (isAdmin ||
      demandaSelecionada.criadoPorId === session.userId ||
      demandaSelecionada.setorResponsavel === session.setor);

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
              {session.role === "ADMIN"
                ? "Registro de criação, edição, mudança de situação e exclusão de demandas."
                : "Registro de criação, edição, mudança de situação e exclusão das demandas do seu setor."}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGerarPdf}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              Gerar PDF
            </button>
            <Link
              href="/demandas"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              ← Voltar para demandas
            </Link>
          </div>
        </div>

        {avisoDemanda && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-500/10 dark:text-amber-300">
            {avisoDemanda}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por demanda ou descrição do evento..."
            className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento | "")} className={selectClass}>
            <option value="">Tipo: todos</option>
            {TIPO_ORDER.map((t) => (
              <option key={t} value={t}>
                {TIPO_EVENTO_LABEL[t]}
              </option>
            ))}
          </select>
          <select value={setor} onChange={(e) => setSetor(e.target.value as Setor | "")} className={selectClass}>
            <option value="">Setor: todos</option>
            {SETORES.map((s) => (
              <option key={s} value={s}>
                {SETOR_LABEL[s]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            De
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
            Até
            <input
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
          <label
            className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300"
            title="Mostra só as mudanças de situação que resultaram em Concluída ou Entregue"
          >
            <input
              type="checkbox"
              checked={somenteConcluidasEntregues}
              onChange={(e) => setSomenteConcluidasEntregues(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            Só concluídas e entregues
          </label>
          {(desde || ate || setor || somenteConcluidasEntregues || filtroDemandaId) && (
            <button
              type="button"
              onClick={() => {
                setDesde("");
                setAte("");
                setSetor("");
                setSomenteConcluidasEntregues(false);
                setFiltroDemandaId(null);
              }}
              className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {filtroDemandaId && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Mostrando só o histórico de uma demanda.{" "}
            <button
              type="button"
              onClick={() => setFiltroDemandaId(null)}
              className="font-medium text-zinc-700 underline-offset-2 hover:underline dark:text-zinc-300"
            >
              Ver tudo de novo
            </button>
          </p>
        )}

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
                    <button
                      type="button"
                      onClick={() => abrirDemanda(ev.demandaId)}
                      className="text-left font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {ev.demandaTitulo}
                      {ev.exemplo && (
                        <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          exemplo
                        </span>
                      )}
                    </button>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_EVENTO_BADGE_CLASS[ev.tipo]}`}
                    >
                      {TIPO_EVENTO_LABEL[ev.tipo]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {formatarData(ev.createdAt)} · {SETOR_LABEL[ev.usuarioSetor]} ({ev.usuarioNome})
                  </p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{ev.descricao}</p>
                </div>
              ))}
            </div>

            {/* Tabela: telas médias e maiores */}
            <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:block">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Demanda</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Quem</th>
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
                      <button
                        type="button"
                        onClick={() => abrirDemanda(ev.demandaId)}
                        className="text-left hover:underline"
                      >
                        {ev.demandaTitulo}
                      </button>
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
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <p>{SETOR_LABEL[ev.usuarioSetor]}</p>
                      <p>{ev.usuarioNome}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{ev.descricao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {proximoCursor && !filtroDemandaId && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={carregarMais}
                  disabled={carregandoMais}
                  className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  {carregandoMais ? "Carregando..." : "Carregar mais"}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {carregandoDemanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <p className="rounded-lg bg-white px-4 py-2 text-sm text-zinc-700 shadow-lg dark:bg-zinc-950 dark:text-zinc-300">
            Abrindo demanda...
          </p>
        </div>
      )}

      {demandaSelecionada && (
        <DemandaDetalheModal
          demanda={demandaSelecionada}
          onClose={() => setDemandaSelecionada(null)}
          podeEditar={podeEditarSelecionada}
          onEditar={() => {
            setDemandaParaEditar(demandaSelecionada);
            setDemandaSelecionada(null);
          }}
          onVerHistorico={() => {
            setFiltroDemandaId(demandaSelecionada.id);
            setDemandaSelecionada(null);
          }}
        />
      )}

      {demandaParaEditar && (
        <DemandaFormModal
          session={session}
          demanda={demandaParaEditar}
          onClose={() => setDemandaParaEditar(null)}
          onSaved={() => setDemandaParaEditar(null)}
        />
      )}
    </div>
  );
}
