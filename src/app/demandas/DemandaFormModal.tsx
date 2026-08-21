"use client";

import { useState } from "react";
import {
  PRIORIDADE_LABEL,
  PRIORIDADE_ORDER,
  PRODUTO_LABEL,
  PRODUTO_ORDER,
  SETOR_LABEL,
  SETORES_RESPONSAVEL,
} from "@/lib/constants";
import type { DemandaDTO, SessionInfo } from "@/lib/types";
import type { Prioridade, Setor, TipoProduto } from "@/generated/prisma/client";

type Props = {
  session: SessionInfo;
  demanda: DemandaDTO | null; // null = criação
  onClose: () => void;
  onSaved: () => void;
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function DemandaFormModal({ session, demanda, onClose, onSaved }: Props) {
  const editando = demanda !== null;
  const setorSolicitante = editando ? demanda!.setorSolicitante : session.setor;
  const setoresDestino = SETORES_RESPONSAVEL.filter((s) => s !== setorSolicitante);

  const [titulo, setTitulo] = useState(demanda?.titulo ?? "");
  const [descricao, setDescricao] = useState(demanda?.descricao ?? "");
  const [setorResponsavel, setSetorResponsavel] = useState<Setor>(
    demanda?.setorResponsavel ?? setoresDestino[0]
  );
  const [prioridade, setPrioridade] = useState<Prioridade>(demanda?.prioridade ?? "MEDIA");
  const [prazo, setPrazo] = useState(demanda?.prazo ? demanda.prazo.slice(0, 10) : "");
  const [produtos, setProdutos] = useState<Set<TipoProduto>>(new Set(demanda?.produtos ?? []));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function alternarProduto(produto: TipoProduto) {
    setProdutos((atual) => {
      const novo = new Set(atual);
      if (novo.has(produto)) {
        novo.delete(produto);
      } else {
        novo.add(produto);
      }
      return novo;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const payload = {
        titulo,
        descricao: descricao || null,
        setorResponsavel,
        prioridade,
        prazo: prazo || null,
        produtos: Array.from(produtos),
      };
      const res = await fetch(editando ? `/api/demandas/${demanda!.id}` : "/api/demandas", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível salvar a demanda.");
        return;
      }
      onSaved();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {editando ? "Editar demanda" : "Nova demanda"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="titulo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Título
            </label>
            <input
              id="titulo"
              required
              minLength={3}
              maxLength={200}
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={inputClass}
              placeholder="Ex: Reposição de arame de latão 0,8mm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="descricao" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Descrição (opcional)
            </label>
            <textarea
              id="descricao"
              rows={3}
              maxLength={2000}
              value={descricao ?? ""}
              onChange={(e) => setDescricao(e.target.value)}
              className={inputClass}
              placeholder="Detalhes da demanda..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Solicitante</span>
              <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                {SETOR_LABEL[setorSolicitante]}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="setorResponsavel" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Setor responsável
              </label>
              <select
                id="setorResponsavel"
                value={setorResponsavel}
                onChange={(e) => setSetorResponsavel(e.target.value as Setor)}
                className={inputClass}
              >
                {setoresDestino.map((s) => (
                  <option key={s} value={s}>
                    {SETOR_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="prioridade" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Prioridade
              </label>
              <select
                id="prioridade"
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as Prioridade)}
                className={inputClass}
              >
                {PRIORIDADE_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {PRIORIDADE_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="prazo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Prazo — para quando (opcional)
              </label>
              <input
                id="prazo"
                type="date"
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Produtos (opcional)
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Clique para selecionar um ou mais produtos relacionados a esta demanda.
            </p>
            <div className="flex flex-wrap gap-2">
              {PRODUTO_ORDER.map((produto) => {
                const selecionado = produtos.has(produto);
                return (
                  <button
                    key={produto}
                    type="button"
                    onClick={() => alternarProduto(produto)}
                    aria-pressed={selecionado}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      selecionado
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {PRODUTO_LABEL[produto]}
                  </button>
                );
              })}
            </div>
          </div>

          {erro && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
              {erro}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar demanda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
