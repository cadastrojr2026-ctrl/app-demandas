"use client";

import { useState } from "react";
import { ROLE_LABEL, ROLES, SETOR_LABEL, SETORES } from "@/lib/constants";
import type { UserDTO } from "@/lib/types";
import type { Role, Setor } from "@/generated/prisma/client";

type Props = {
  usuario: UserDTO | null; // null = criação
  onClose: () => void;
  onSaved: () => void;
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export function UsuarioFormModal({ usuario, onClose, onSaved }: Props) {
  const editando = usuario !== null;

  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [login, setLogin] = useState(usuario?.usuario ?? "");
  const [setor, setSetor] = useState<Setor>(usuario?.setor ?? "ESTOQUE");
  const [role, setRole] = useState<Role>(usuario?.role ?? "USER");
  const [trocarSenha, setTrocarSenha] = useState(!editando);
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (trocarSenha && senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSalvando(true);
    try {
      const payload: Record<string, unknown> = { nome, usuario: login, setor, role };
      if (trocarSenha) payload.senha = senha;

      const res = await fetch(editando ? `/api/users/${usuario!.id}` : "/api/users", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível salvar o usuário.");
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
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          {editando ? "Editar usuário" : "Novo usuário"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nome" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nome
            </label>
            <input
              id="nome"
              required
              minLength={2}
              maxLength={120}
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClass}
              placeholder="Ex: Maria Silva"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Usuário (login)
            </label>
            <input
              id="login"
              required
              minLength={3}
              maxLength={40}
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className={inputClass}
              placeholder="Ex: maria.silva"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="setor" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Setor
              </label>
              <select
                id="setor"
                value={setor}
                onChange={(e) => setSetor(e.target.value as Setor)}
                className={inputClass}
              >
                {SETORES.map((s) => (
                  <option key={s} value={s}>
                    {SETOR_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Papel
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className={inputClass}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editando && !trocarSenha ? (
            <button
              type="button"
              onClick={() => setTrocarSenha(true)}
              className="self-start text-sm font-medium text-zinc-700 underline decoration-dotted hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Trocar senha
            </button>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="senha" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {editando ? "Nova senha" : "Senha"}
                </label>
                {editando && (
                  <button
                    type="button"
                    onClick={() => {
                      setTrocarSenha(false);
                      setSenha("");
                    }}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    Cancelar
                  </button>
                )}
              </div>
              <input
                id="senha"
                type="text"
                minLength={6}
                maxLength={72}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={inputClass}
                placeholder="Mínimo 6 caracteres"
                autoComplete="off"
              />
            </div>
          )}

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
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
