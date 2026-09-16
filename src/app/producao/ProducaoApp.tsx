"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import type { SessionInfo } from "@/lib/types";

interface ItemPorCodigo {
  codigo: string;
  quantidade: number;
  demandas: number;
}

interface ResumoProducao {
  demandasSolicitadas: number;
  totalPecasProduzidas: number;
  tiposDePeca: number;
  itensPorCodigo: ItemPorCodigo[];
}

export function ProducaoApp({ session }: { session: SessionInfo }) {
  const [resumo, setResumo] = useState<ResumoProducao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [desde, setDesde] = useState("");
  const [ate, setAte] = useState("");

  function handleGerarPdf() {
    const params = new URLSearchParams();
    if (desde) params.set("desde", desde);
    if (ate) params.set("ate", ate);
    window.open(`/api/producao/pdf?${params.toString()}`, "_blank");
  }

  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const params = new URLSearchParams();
        if (desde) params.set("desde", desde);
        if (ate) params.set("ate", ate);
        const query = params.toString();
        const res = await fetch(`/api/producao${query ? `?${query}` : ""}`);
        if (!res.ok) throw new Error("Falha ao carregar o resumo de produção.");
        const data = await res.json();
        setResumo(data);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro desconhecido.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [desde, ate]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black md:flex-row">
      <Sidebar session={session} />

      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Produção</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {session.role === "ADMIN"
                ? "Peças produzidas e demandas solicitadas, a partir dos itens registrados em cada demanda."
                : "Peças produzidas e demandas solicitadas pelo seu setor, a partir dos itens registrados em cada demanda."}
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

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
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
          {(desde || ate) && (
            <button
              type="button"
              onClick={() => {
                setDesde("");
                setAte("");
              }}
              className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Limpar período
            </button>
          )}
        </div>

        {carregando ? (
          <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Carregando...</p>
        ) : erro ? (
          <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">{erro}</p>
        ) : resumo ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Demandas solicitadas
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {resumo.demandasSolicitadas}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Peças produzidas
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {resumo.totalPecasProduzidas}
                </p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Tipos de peça produzidos
                </p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {resumo.tiposDePeca}
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Por código ({resumo.itensPorCodigo.length})
              </h2>
              {resumo.itensPorCodigo.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
                  Nenhum item produzido registrado ainda. Adicione itens (código + quantidade) ao editar
                  uma demanda.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        <th className="px-4 py-3 font-medium">Código</th>
                        <th className="px-4 py-3 font-medium">Quantidade produzida</th>
                        <th className="px-4 py-3 font-medium">Em quantas demandas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumo.itensPorCodigo.map((item) => (
                        <tr
                          key={item.codigo}
                          className="border-b border-zinc-100 last:border-0 dark:border-zinc-900"
                        >
                          <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                            {item.codigo}
                          </td>
                          <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{item.quantidade}</td>
                          <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{item.demandas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
