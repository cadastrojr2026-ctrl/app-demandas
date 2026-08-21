import type { Prioridade, Role, Setor, StatusDemanda, TipoEvento } from "@/generated/prisma/client";

export interface DemandaDTO {
  id: number;
  titulo: string;
  descricao: string | null;
  setorSolicitante: Setor;
  setorResponsavel: Setor;
  status: StatusDemanda;
  prioridade: Prioridade;
  prazo: string | null;
  criadoPorId: number;
  exemplo: boolean;
  createdAt: string;
  updatedAt: string;
  criadoPor: { id: number; nome: string; setor: Setor };
}

export interface SessionInfo {
  userId: number;
  usuario: string;
  nome: string;
  setor: Setor;
  role: Role;
}

export interface HistoricoEventoDTO {
  id: number;
  demandaId: number;
  demandaTitulo: string;
  tipo: TipoEvento;
  descricao: string;
  usuarioNome: string;
  usuarioSetor: Setor;
  exemplo: boolean;
  createdAt: string;
}
