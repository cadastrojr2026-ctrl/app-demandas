import type { Prioridade, Setor, StatusDemanda } from "@/generated/prisma/client";

export const SETORES: Setor[] = ["ESTOQUE", "ALMOXARIFADO", "FUNDICAO"];

export const SETOR_LABEL: Record<Setor, string> = {
  ESTOQUE: "Estoque",
  ALMOXARIFADO: "Almoxarifado",
  FUNDICAO: "Fundição",
};

export const STATUS_ORDER: StatusDemanda[] = [
  "PENDENTE",
  "EM_ANDAMENTO",
  "CONCLUIDA",
  "CANCELADA",
];

export const STATUS_LABEL: Record<StatusDemanda, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

// classes tailwind para os badges de status (funciona em claro/escuro)
export const STATUS_BADGE_CLASS: Record<StatusDemanda, string> = {
  PENDENTE:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20 dark:ring-amber-400/20",
  EM_ANDAMENTO:
    "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 ring-1 ring-inset ring-blue-600/20 dark:ring-blue-400/20",
  CONCLUIDA:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-400/20",
  CANCELADA:
    "bg-neutral-200 text-neutral-700 dark:bg-neutral-500/15 dark:text-neutral-300 ring-1 ring-inset ring-neutral-500/20",
};

export const PRIORIDADE_ORDER: Prioridade[] = ["ALTA", "MEDIA", "BAIXA"];

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

export const PRIORIDADE_BADGE_CLASS: Record<Prioridade, string> = {
  ALTA: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 ring-1 ring-inset ring-red-600/20 dark:ring-red-400/20",
  MEDIA:
    "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 ring-1 ring-inset ring-sky-600/20 dark:ring-sky-400/20",
  BAIXA:
    "bg-neutral-100 text-neutral-700 dark:bg-neutral-500/15 dark:text-neutral-300 ring-1 ring-inset ring-neutral-500/20",
};
