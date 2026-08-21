import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não definida (configure no .env).");
}
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function upsertUser(params: {
  usuario: string;
  nome: string;
  senha: string;
  setor: "ESTOQUE" | "ALMOXARIFADO" | "FUNDICAO";
  role: "ADMIN" | "USER";
}) {
  const senhaHash = await bcrypt.hash(params.senha, 10);
  return prisma.user.upsert({
    where: { usuario: params.usuario },
    update: {},
    create: {
      usuario: params.usuario,
      nome: params.nome,
      senhaHash,
      setor: params.setor,
      role: params.role,
    },
  });
}

async function main() {
  const estoque = await upsertUser({
    usuario: "estoque",
    nome: "Estoque",
    senha: "estoque123",
    setor: "ESTOQUE",
    role: "ADMIN",
  });
  const almoxarifado = await upsertUser({
    usuario: "almoxarifado",
    nome: "Almoxarifado",
    senha: "almoxarifado123",
    setor: "ALMOXARIFADO",
    role: "USER",
  });
  const fundicao = await upsertUser({
    usuario: "fundicao",
    nome: "Fundição",
    senha: "fundicao123",
    setor: "FUNDICAO",
    role: "USER",
  });

  console.log("Usuários cadastrados/verificados:");
  console.log("  estoque / estoque123 (admin)");
  console.log("  almoxarifado / almoxarifado123");
  console.log("  fundicao / fundicao123");

  const totalDemandas = await prisma.demanda.count();
  if (totalDemandas > 0) {
    console.log("Já existem demandas no banco — pulando criação de exemplos.");
    return;
  }

  await prisma.demanda.createMany({
    data: [
      {
        titulo: "Reposição de arame de latão 0,8mm",
        descricao: "Estoque baixo de arame de latão para produção da linha de brincos.",
        setorSolicitante: "ESTOQUE",
        setorResponsavel: "ALMOXARIFADO",
        status: "PENDENTE",
        prioridade: "ALTA",
        criadoPorId: estoque.id,
        exemplo: true,
      },
      {
        titulo: "Compra de banho de ouro 24k (lote 500ml)",
        descricao: "Necessário para atender pedidos da coleção de anéis.",
        setorSolicitante: "ESTOQUE",
        setorResponsavel: "ALMOXARIFADO",
        status: "EM_ANDAMENTO",
        prioridade: "MEDIA",
        criadoPorId: estoque.id,
        exemplo: true,
      },
      {
        titulo: "Fundição de 2kg de liga para colares",
        descricao: "Lote referente ao pedido nº 1042 da coleção Primavera.",
        setorSolicitante: "ESTOQUE",
        setorResponsavel: "FUNDICAO",
        status: "PENDENTE",
        prioridade: "ALTA",
        criadoPorId: estoque.id,
        exemplo: true,
      },
      {
        titulo: "Fundição de peças para pulseiras (molde nº 12)",
        descricao: null,
        setorSolicitante: "ESTOQUE",
        setorResponsavel: "FUNDICAO",
        status: "CONCLUIDA",
        prioridade: "MEDIA",
        criadoPorId: estoque.id,
        exemplo: true,
      },
      {
        titulo: "Reposição de embalagens e caixas para envio",
        descricao: "Faltam caixas pequenas para o setor de expedição.",
        setorSolicitante: "ESTOQUE",
        setorResponsavel: "ALMOXARIFADO",
        status: "CONCLUIDA",
        prioridade: "BAIXA",
        criadoPorId: estoque.id,
        exemplo: true,
      },
      {
        titulo: "Solicitação de mais lixas para polimento",
        descricao: "Uso diário no acabamento das peças fundidas.",
        setorSolicitante: "FUNDICAO",
        setorResponsavel: "ALMOXARIFADO",
        status: "PENDENTE",
        prioridade: "MEDIA",
        criadoPorId: fundicao.id,
        exemplo: true,
      },
      {
        titulo: "Cancelamento de fundição do molde antigo",
        descricao: "Molde substituído por versão nova, pedido cancelado.",
        setorSolicitante: "ESTOQUE",
        setorResponsavel: "FUNDICAO",
        status: "CANCELADA",
        prioridade: "BAIXA",
        criadoPorId: estoque.id,
        exemplo: true,
      },
      {
        titulo: "Falta de cera para injeção de moldes",
        descricao: "Estoque de cera de injeção está acabando, avisar compras.",
        setorSolicitante: "ALMOXARIFADO",
        setorResponsavel: "ESTOQUE",
        status: "EM_ANDAMENTO",
        prioridade: "ALTA",
        criadoPorId: almoxarifado.id,
        exemplo: true,
      },
    ],
  });

  console.log("Demandas de exemplo criadas.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
