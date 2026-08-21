import type { Prioridade, Role, Setor, StatusDemanda } from "@/generated/prisma/client";

export interface DemandaDTO {
  id: number;
  titulo: string;
  descricao: string | null;
  setorSolicitante: Setor;
  setorResponsavel: Setor;
  status: StatusDemanda;
  prioridade: Prioridade;
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
