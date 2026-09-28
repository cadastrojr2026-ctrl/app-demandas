"use client";

import { useState } from "react";
import {
  PRIORIDADE_BADGE_CLASS,
  PRIORIDADE_LABEL,
  PRODUTO_LABEL,
  SETOR_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
} from "@/lib/constants";
import type { DemandaDTO, ItemBaixaDTO, ItemProduzidoDTO } from "@/lib/types";

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

// Uma linha de item produzido, com seu histórico de baixas (entregas parciais) — cada baixa
// tem sua própria data e nunca altera a "quantidade" do item, que continua sendo o total
// produzido/pedido. Só quem pode editar a demanda registra novas baixas.
function ItemProduzidoLinha({
  item,
  podeEditar,
  onBaixaRegistrada,
  onBaixaRemovida,
}: {
  item: ItemProduzidoDTO;
  podeEditar: boolean;
  onBaixaRegistrada: (itemId: number, baixa: ItemBaixaDTO) => void;
  onBaixaRemovida: (itemId: number, baixaId: number) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const [quantidade, setQuantidade] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [removendoId, setRemovendoId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const entregue = item.baixas.reduce((soma, b) => soma + b.quantidade, 0);
  const restante = item.quantidade - entregue;

  async function handleRegistrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await fetch(`/api/itens/${item.id}/baixas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantidade: Number(quantidade) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível registrar a baixa.");
        return;
      }
      onBaixaRegistrada(item.id, data.baixa);
      setQuantidade("");
      setExpandido(true);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleRemover(baixaId: number) {
    setErro(null);
    setRemovendoId(baixaId);
    try {
      const res = await fetch(`/api/baixas/${baixaId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? "Não foi possível excluir a baixa.");
        return;
      }
      onBaixaRemovida(item.id, baixaId);
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setRemovendoId(null);
    }
  }

  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-zinc-100 px-2.5 py-2 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.codigo}</span>
        <span className="text-zinc-500 dark:text-zinc-400">
          {entregue > 0 ? `${entregue} / ${item.quantidade} entregue` : item.quantidade}
        </span>
      </div>

      {item.baixas.length > 0 && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="self-start text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {expandido ? "Ocultar" : "Ver"} {item.baixas.length} baixa{item.baixas.length > 1 ? "s" : ""}
        </button>
      )}
      {expandido && (
        <ul className="flex flex-col gap-0.5 border-l border-zinc-200 pl-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          {item.baixas.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2">
              <span>
                {formatarData(b.createdAt)} — {b.quantidade} un. ({b.criadoPor.nome})
              </span>
              {podeEditar && (
                <button
                  type="button"
                  onClick={() => handleRemover(b.id)}
                  disabled={removendoId === b.id}
                  title="Excluir baixa (dada por engano)"
                  className="shrink-0 text-red-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
                >
                  {removendoId === b.id ? "..." : "Excluir"}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeEditar && (
        <form onSubmit={handleRegistrar} className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            placeholder={restante > 0 ? `Entregar (restam ${restante})` : "Entregar"}
            className="w-40 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={enviando || !quantidade}
            className="rounded-lg bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Dar baixa
          </button>
        </form>
      )}
      {erro && <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>}
    </li>
  );
}

// Visão completa e só-leitura de uma demanda (sem os truncamentos de linha da listagem) —
// aberta ao clicar na demanda, disponível tanto pro admin quanto pros usuários comuns.
export function DemandaDetalheModal({
  demanda,
  onClose,
  onEditar,
  onVerHistorico,
  podeEditar,
  onExcluir,
}: {
  demanda: DemandaDTO;
  onClose: () => void;
  onEditar: () => void;
  onVerHistorico: () => void;
  podeEditar: boolean;
  // Só passado pelas telas que oferecem excluir por aqui (hoje só o Histórico, e só pro
  // administrador) — quando ausente, o botão "Excluir" nem aparece.
  onExcluir?: () => void;
}) {
  // Estado local (baixas registradas nesta sessão do modal) — o chamador deve renderizar com
  // key={demanda.id} pra esse estado resetar sozinho quando o modal trocar de demanda.
  const [itens, setItens] = useState(demanda.itens);

  function handleBaixaRegistrada(itemId: number, baixa: ItemBaixaDTO) {
    setItens((atual) => atual.map((i) => (i.id === itemId ? { ...i, baixas: [...i.baixas, baixa] } : i)));
  }

  function handleBaixaRemovida(itemId: number, baixaId: number) {
    setItens((atual) =>
      atual.map((i) => (i.id === itemId ? { ...i, baixas: i.baixas.filter((b) => b.id !== baixaId) } : i))
    );
  }

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

        {itens.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Itens produzidos
            </p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {itens.map((item) => (
                <ItemProduzidoLinha
                  key={item.id}
                  item={item}
                  podeEditar={podeEditar}
                  onBaixaRegistrada={handleBaixaRegistrada}
                  onBaixaRemovida={handleBaixaRemovida}
                />
              ))}
            </ul>
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
            {demanda.produtos.includes("OUTROS") && demanda.produtoOutroDetalhe && (
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300">
                Outros: {demanda.produtoOutroDetalhe}
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          {onExcluir && (
            <button
              type="button"
              onClick={onExcluir}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Excluir
            </button>
          )}
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
