"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SummaryCards } from "./SummaryCards";
import { FiltersBar, FILTROS_VAZIOS, type Filters } from "./FiltersBar";
import { DemandasTable } from "./DemandasTable";
import { DemandaFormModal } from "./DemandaFormModal";
import { HistoricoDemandaModal } from "./HistoricoDemandaModal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { DemandaDTO, SessionInfo } from "@/lib/types";
import type { StatusDemanda } from "@/generated/prisma/client";

export function DemandasApp({ session }: { session: SessionInfo }) {
  const [demandas, setDemandas] = useState<DemandaDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(FILTROS_VAZIOS);

  const [modal, setModal] = useState<{ demanda: DemandaDTO | null } | null>(null);
  const [paraHistorico, setParaHistorico] = useState<DemandaDTO | null>(null);
  const [paraExcluir, setParaExcluir] = useState<DemandaDTO | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);
  const [limpando, setLimpando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregar(null);
    try {
      const res = await fetch("/api/demandas");
      if (!res.ok) throw new Error("Falha ao carregar demandas.");
      const data = await res.json();
      setDemandas(data.demandas);
    } catch (e) {
      setErroCarregar(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Busca inicial e recargas manuais disparam fetch (e setState) fora do fluxo síncrono do efeito.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(() => setMensagem(null), 4000);
    return () => clearTimeout(t);
  }, [mensagem]);

  const demandasFiltradas = useMemo(() => {
    return demandas.filter((d) => {
      if (filters.status && d.status !== filters.status) return false;
      if (filters.setorResponsavel && d.setorResponsavel !== filters.setorResponsavel) return false;
      if (filters.setorSolicitante && d.setorSolicitante !== filters.setorSolicitante) return false;
      if (filters.prioridade && d.prioridade !== filters.prioridade) return false;
      if (filters.somenteMinhas && d.criadoPorId !== session.userId) return false;
      if (filters.q) {
        const termo = filters.q.toLowerCase();
        const alvo = `${d.titulo} ${d.descricao ?? ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
  }, [demandas, filters, session.userId]);

  async function handleChangeStatus(demanda: DemandaDTO, status: StatusDemanda) {
    const res = await fetch(`/api/demandas/${demanda.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMensagem(data.error ?? "Não foi possível alterar a situação.");
      return;
    }
    setDemandas((prev) => prev.map((d) => (d.id === demanda.id ? data.demanda : d)));
  }

  async function handleExcluir() {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      const res = await fetch(`/api/demandas/${paraExcluir.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensagem(data.error ?? "Não foi possível excluir a demanda.");
        return;
      }
      setDemandas((prev) => prev.filter((d) => d.id !== paraExcluir.id));
      setMensagem("Demanda excluída.");
    } finally {
      setExcluindo(false);
      setParaExcluir(null);
    }
  }

  async function handleLimparExemplos() {
    setLimpando(true);
    try {
      const res = await fetch("/api/demandas/exemplos", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setMensagem(data.error ?? "Não foi possível remover os dados de exemplo.");
        return;
      }
      setMensagem(`${data.count} demanda(s) de exemplo removida(s).`);
      await carregar();
    } finally {
      setLimpando(false);
      setConfirmarLimpeza(false);
    }
  }

  const temExemplos = demandas.some((d) => d.exemplo);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black md:flex-row">
      <Sidebar session={session} />

      <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        {mensagem && (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            {mensagem}
          </div>
        )}

        <SummaryCards demandas={demandas} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Demandas ({demandasFiltradas.length})
          </h2>
          <div className="flex gap-2">
            {session.role === "ADMIN" && temExemplos && (
              <button
                type="button"
                onClick={() => setConfirmarLimpeza(true)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
              >
                Remover dados de exemplo
              </button>
            )}
            <button
              type="button"
              onClick={() => setModal({ demanda: null })}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              + Nova demanda
            </button>
          </div>
        </div>

        <FiltersBar filters={filters} onChange={setFilters} />

        {carregando ? (
          <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Carregando...</p>
        ) : erroCarregar ? (
          <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">{erroCarregar}</p>
        ) : (
          <DemandasTable
            demandas={demandasFiltradas}
            session={session}
            onEdit={(d) => setModal({ demanda: d })}
            onDelete={(d) => setParaExcluir(d)}
            onChangeStatus={handleChangeStatus}
            onVerHistorico={(d) => setParaHistorico(d)}
          />
        )}
      </main>

      {paraHistorico && (
        <HistoricoDemandaModal demanda={paraHistorico} onClose={() => setParaHistorico(null)} />
      )}

      {modal && (
        <DemandaFormModal
          session={session}
          demanda={modal.demanda}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setMensagem(modal.demanda ? "Demanda atualizada." : "Demanda criada.");
            carregar();
          }}
        />
      )}

      {paraExcluir && (
        <ConfirmDialog
          title="Excluir demanda"
          description={`Tem certeza que deseja excluir "${paraExcluir.titulo}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          loading={excluindo}
          onConfirm={handleExcluir}
          onCancel={() => setParaExcluir(null)}
        />
      )}

      {confirmarLimpeza && (
        <ConfirmDialog
          title="Remover dados de exemplo"
          description="Todas as demandas marcadas como exemplo serão excluídas permanentemente. As demandas reais não são afetadas."
          confirmLabel="Remover"
          danger
          loading={limpando}
          onConfirm={handleLimparExemplos}
          onCancel={() => setConfirmarLimpeza(false)}
        />
      )}
    </div>
  );
}
