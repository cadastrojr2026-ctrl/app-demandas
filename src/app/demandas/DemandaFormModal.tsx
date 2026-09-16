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

// Sem o "w-full" do inputClass acima — usado nos campos de item (código/quantidade), que
// ficam lado a lado numa linha flex e definem a própria largura (flex-1 / w-24). Combinar
// "w-full" com "flex-1"/"w-24" no mesmo elemento faz o "w-full" (100%) vencer no CSS do
// Tailwind, espremendo o campo de código e estourando o de quantidade.
const inputClassSemLargura = inputClass.replace("w-full ", "");

export function DemandaFormModal({ session, demanda, onClose, onSaved }: Props) {
  const editando = demanda !== null;
  const setorSolicitante = editando ? demanda!.setorSolicitante : session.setor;
  const setoresDestino = SETORES_RESPONSAVEL.filter((s) => s !== setorSolicitante);

  // Quem não é admin nem criou a demanda, mas é do setor responsável por atendê-la, só pode
  // editar a observação — os outros campos ficam travados (mesma regra da API).
  const isAdmin = session.role === "ADMIN";
  const isCriador = editando ? demanda!.criadoPorId === session.userId : true;
  const isResponsavel = editando ? demanda!.setorResponsavel === session.setor : false;
  const canEditFull = !editando || isAdmin || isCriador;
  const somenteObservacao = editando && !canEditFull && isResponsavel;

  const [titulo, setTitulo] = useState(demanda?.titulo ?? "");
  const [descricao, setDescricao] = useState(demanda?.descricao ?? "");
  const [observacao, setObservacao] = useState(demanda?.observacao ?? "");
  const [setorResponsavel, setSetorResponsavel] = useState<Setor>(
    demanda?.setorResponsavel ?? setoresDestino[0]
  );
  const [prioridade, setPrioridade] = useState<Prioridade>(demanda?.prioridade ?? "MEDIA");
  const [prazo, setPrazo] = useState(demanda?.prazo ? demanda.prazo.slice(0, 10) : "");
  const [produtos, setProdutos] = useState<Set<TipoProduto>>(new Set(demanda?.produtos ?? []));
  const [itens, setItens] = useState<{ codigo: string; quantidade: string }[]>(
    demanda?.itens.map((i) => ({ codigo: i.codigo, quantidade: String(i.quantidade) })) ?? []
  );
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

  function adicionarItem() {
    setItens((atual) => [...atual, { codigo: "", quantidade: "" }]);
  }

  function atualizarItem(indice: number, campo: "codigo" | "quantidade", valor: string) {
    setItens((atual) => atual.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(indice: number) {
    setItens((atual) => atual.filter((_, i) => i !== indice));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      // Só manda itens com código preenchido e quantidade válida — linhas em branco (ex: o
      // usuário clicou em "+ Adicionar item" e não chegou a preencher) são ignoradas.
      const itensValidos = itens
        .map((i) => ({ codigo: i.codigo.trim(), quantidade: Number(i.quantidade) }))
        .filter((i) => i.codigo && Number.isFinite(i.quantidade) && i.quantidade > 0);

      const payload = somenteObservacao
        ? { observacao: observacao || null, itens: itensValidos }
        : {
            titulo,
            descricao: descricao || null,
            observacao: observacao || null,
            setorResponsavel,
            prioridade,
            prazo: prazo || null,
            produtos: Array.from(produtos),
            itens: itensValidos,
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

        {somenteObservacao && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
            Você só pode editar a observação desta demanda. Os outros campos são só leitura.
          </p>
        )}

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
              autoFocus={!somenteObservacao}
              disabled={somenteObservacao}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
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
              disabled={somenteObservacao}
              value={descricao ?? ""}
              onChange={(e) => setDescricao(e.target.value)}
              className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
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
                disabled={somenteObservacao}
                value={setorResponsavel}
                onChange={(e) => setSetorResponsavel(e.target.value as Setor)}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
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
                disabled={somenteObservacao}
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as Prioridade)}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
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
                disabled={somenteObservacao}
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-60`}
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
                    disabled={somenteObservacao}
                    onClick={() => alternarProduto(produto)}
                    aria-pressed={selecionado}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
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

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Itens produzidos (opcional)
            </span>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Código da peça e quantidade produzida pra atender esta demanda — alimenta o relatório de
              produção.
            </p>
            <div className="flex flex-col gap-2">
              {itens.map((item, indice) => (
                <div key={indice} className="flex gap-2">
                  <input
                    type="text"
                    value={item.codigo}
                    onChange={(e) => atualizarItem(indice, "codigo", e.target.value)}
                    placeholder="Código (ex: ARG05766)"
                    maxLength={50}
                    className={`${inputClassSemLargura} min-w-0 flex-1`}
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => atualizarItem(indice, "quantidade", e.target.value)}
                    placeholder="Qtd."
                    className={`${inputClassSemLargura} w-24 shrink-0`}
                  />
                  <button
                    type="button"
                    onClick={() => removerItem(indice)}
                    aria-label="Remover item"
                    className="shrink-0 rounded-lg border border-zinc-300 px-2.5 text-sm text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={adicionarItem}
              className="self-start rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              + Adicionar item
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="observacao" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Observação (opcional)
            </label>
            <textarea
              id="observacao"
              rows={2}
              maxLength={2000}
              autoFocus={somenteObservacao}
              value={observacao ?? ""}
              onChange={(e) => setObservacao(e.target.value)}
              className={inputClass}
              placeholder="Ex: entregue parcialmente, aguardando o restante..."
            />
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
              {salvando
                ? "Salvando..."
                : somenteObservacao
                  ? "Salvar observação"
                  : editando
                    ? "Salvar alterações"
                    : "Criar demanda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
