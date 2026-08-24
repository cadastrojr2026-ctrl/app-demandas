"use client";

import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ROLE_LABEL, SETOR_LABEL } from "@/lib/constants";
import type { SessionInfo, UserDTO } from "@/lib/types";
import { UsuarioFormModal } from "./UsuarioFormModal";

function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(
    new Date(iso)
  );
}

export function UsuariosApp({ session }: { session: SessionInfo }) {
  const [usuarios, setUsuarios] = useState<UserDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  const [modal, setModal] = useState<{ usuario: UserDTO | null } | null>(null);
  const [paraExcluir, setParaExcluir] = useState<UserDTO | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [verificando, setVerificando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregar(null);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Falha ao carregar usuários.");
      const data = await res.json();
      setUsuarios(data.users);
    } catch (e) {
      setErroCarregar(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  useEffect(() => {
    if (!mensagem) return;
    const t = setTimeout(() => setMensagem(null), 5000);
    return () => clearTimeout(t);
  }, [mensagem]);

  async function handleExcluir() {
    if (!paraExcluir) return;
    setExcluindo(true);
    try {
      const res = await fetch(`/api/users/${paraExcluir.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensagem(data.error ?? "Não foi possível excluir o usuário.");
        return;
      }
      setUsuarios((prev) => prev.filter((u) => u.id !== paraExcluir.id));
      setMensagem("Usuário excluído.");
    } finally {
      setExcluindo(false);
      setParaExcluir(null);
    }
  }

  async function handleTestarNotificacao() {
    setVerificando(true);
    try {
      const res = await fetch("/api/cron/demandas-paradas", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMensagem(data.error ?? "Não foi possível verificar demandas paradas.");
        return;
      }
      const { encontradas, notificadas, falhas } = data as {
        encontradas: number;
        notificadas: number;
        falhas: { demandaId: number; erro: string }[];
      };
      if (encontradas === 0) {
        setMensagem("Nenhuma demanda de alta prioridade parada no momento.");
      } else {
        const falhaTxt = falhas.length > 0 ? ` (${falhas.length} falha(s) — veja o servidor)` : "";
        setMensagem(`${encontradas} demanda(s) parada(s) encontrada(s), ${notificadas} notificada(s)${falhaTxt}.`);
      }
    } catch {
      setMensagem("Erro de conexão ao verificar demandas paradas.");
    } finally {
      setVerificando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black md:flex-row">
      <Sidebar session={session} />

      <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        {mensagem && (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            {mensagem}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Usuários</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Cadastre, edite e troque senhas dos usuários dos três setores.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ usuario: null })}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + Novo usuário
          </button>
        </div>

        {carregando ? (
          <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">Carregando...</p>
        ) : erroCarregar ? (
          <p className="py-10 text-center text-sm text-red-600 dark:text-red-400">{erroCarregar}</p>
        ) : (
          <>
            {/* Cartões: telas pequenas */}
            <div className="flex flex-col gap-3 md:hidden">
              {usuarios.map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {u.nome}
                      {u.id === session.userId && (
                        <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          você
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <p>
                      Usuário: <span className="text-zinc-700 dark:text-zinc-300">{u.usuario}</span>
                    </p>
                    <p>
                      Setor: <span className="text-zinc-700 dark:text-zinc-300">{SETOR_LABEL[u.setor]}</span>
                    </p>
                    <p>
                      Papel: <span className="text-zinc-700 dark:text-zinc-300">{ROLE_LABEL[u.role]}</span>
                    </p>
                    <p>
                      Criado em: <span className="text-zinc-700 dark:text-zinc-300">{formatarData(u.createdAt)}</span>
                    </p>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModal({ usuario: u })}
                      className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setParaExcluir(u)}
                      disabled={u.id === session.userId}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela: telas médias e maiores */}
            <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:block">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Usuário</th>
                  <th className="px-4 py-3 font-medium">Setor</th>
                  <th className="px-4 py-3 font-medium">Papel</th>
                  <th className="px-4 py-3 font-medium">Criado em</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-100 align-top last:border-0 dark:border-zinc-900">
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {u.nome}
                      {u.id === session.userId && (
                        <span className="ml-2 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          você
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{u.usuario}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{SETOR_LABEL[u.setor]}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">{ROLE_LABEL[u.role]}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {formatarData(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setModal({ usuario: u })}
                          className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setParaExcluir(u)}
                          disabled={u.id === session.userId}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}

        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Notificação de demandas paradas (WhatsApp)
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Verifica diariamente (via agendamento) se há demandas de prioridade Alta sem mudança de
            situação há mais de 24h e envia um alerta de WhatsApp. Enquanto nenhum provedor estiver
            configurado (variável <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">WHATSAPP_PROVIDER</code>),
            os alertas só são registrados no log do servidor — veja o <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">README.md</code> para configurar.
          </p>
          <button
            type="button"
            onClick={handleTestarNotificacao}
            disabled={verificando}
            className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {verificando ? "Verificando..." : "Testar agora"}
          </button>
        </div>
      </main>

      {modal && (
        <UsuarioFormModal
          usuario={modal.usuario}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setMensagem(modal.usuario ? "Usuário atualizado." : "Usuário criado.");
            carregar();
          }}
        />
      )}

      {paraExcluir && (
        <ConfirmDialog
          title="Excluir usuário"
          description={`Tem certeza que deseja excluir "${paraExcluir.nome}" (${paraExcluir.usuario})? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          loading={excluindo}
          onConfirm={handleExcluir}
          onCancel={() => setParaExcluir(null)}
        />
      )}
    </div>
  );
}
