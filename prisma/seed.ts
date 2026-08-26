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

function emDias(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

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
  await upsertUser({
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

  // Estoque só solicita — nunca é o setor responsável por atender uma demanda.
  const dadosDemandas = [
    {
      titulo: "Reposição de arame de latão 0,8mm",
      descricao: "Estoque baixo de arame de latão para produção da linha de brincos.",
      setorSolicitante: "ESTOQUE" as const,
      setorResponsavel: "ALMOXARIFADO" as const,
      status: "PENDENTE" as const,
      prioridade: "ALTA" as const,
      prazo: emDias(3),
      produtos: ["BRINCO_FIXO" as const, "BRINCO_MEDIO" as const],
      criadoPorId: estoque.id,
      exemplo: true,
    },
    {
      titulo: "Compra de banho de ouro 24k (lote 500ml)",
      descricao: "Necessário para atender pedidos da coleção de anéis.",
      setorSolicitante: "ESTOQUE" as const,
      setorResponsavel: "ALMOXARIFADO" as const,
      status: "EM_ANDAMENTO" as const,
      prioridade: "MEDIA" as const,
      prazo: emDias(7),
      produtos: ["ANEL" as const],
      criadoPorId: estoque.id,
      exemplo: true,
    },
    {
      titulo: "Fundição de 2kg de liga para colares",
      descricao: "Lote referente ao pedido nº 1042 da coleção Primavera.",
      setorSolicitante: "ESTOQUE" as const,
      setorResponsavel: "FUNDICAO" as const,
      status: "PENDENTE" as const,
      prioridade: "ALTA" as const,
      prazo: emDias(-1), // vencida, para demonstrar o destaque de atraso
      produtos: ["GARGANTILHA" as const, "CORRENTARIA" as const],
      criadoPorId: estoque.id,
      exemplo: true,
    },
    {
      titulo: "Fundição de peças para pulseiras (molde nº 12)",
      descricao: null,
      setorSolicitante: "ESTOQUE" as const,
      setorResponsavel: "FUNDICAO" as const,
      status: "CONCLUIDA" as const,
      prioridade: "MEDIA" as const,
      prazo: null,
      produtos: ["PULSEIRA" as const],
      criadoPorId: estoque.id,
      exemplo: true,
    },
    {
      titulo: "Reposição de embalagens e caixas para envio",
      descricao: "Faltam caixas pequenas para o setor de expedição.",
      setorSolicitante: "ESTOQUE" as const,
      setorResponsavel: "ALMOXARIFADO" as const,
      status: "CONCLUIDA" as const,
      prioridade: "BAIXA" as const,
      prazo: null,
      criadoPorId: estoque.id,
      exemplo: true,
    },
    {
      titulo: "Solicitação de mais lixas para polimento",
      descricao: "Uso diário no acabamento das peças fundidas.",
      setorSolicitante: "FUNDICAO" as const,
      setorResponsavel: "ALMOXARIFADO" as const,
      status: "PENDENTE" as const,
      prioridade: "MEDIA" as const,
      prazo: emDias(5),
      criadoPorId: fundicao.id,
      exemplo: true,
    },
    {
      titulo: "Cancelamento de fundição do molde antigo",
      descricao: "Molde substituído por versão nova, pedido cancelado.",
      setorSolicitante: "ESTOQUE" as const,
      setorResponsavel: "FUNDICAO" as const,
      status: "CANCELADA" as const,
      prioridade: "BAIXA" as const,
      prazo: null,
      criadoPorId: estoque.id,
      exemplo: true,
    },
    {
      titulo: "Cera de injeção para moldes",
      descricao: "Fundição precisa de mais cera de injeção — verificar estoque no almoxarifado.",
      setorSolicitante: "FUNDICAO" as const,
      setorResponsavel: "ALMOXARIFADO" as const,
      status: "EM_ANDAMENTO" as const,
      prioridade: "ALTA" as const,
      prazo: emDias(2),
      criadoPorId: fundicao.id,
      exemplo: true,
    },
  ];

  const demandasCriadas = [];
  for (const dados of dadosDemandas) {
    demandasCriadas.push(await prisma.demanda.create({ data: dados }));
  }

  console.log("Demandas de exemplo criadas.");

  const nomePorSetor = {
    ESTOQUE: "Estoque",
    ALMOXARIFADO: "Almoxarifado",
    FUNDICAO: "Fundição",
  } as const;

  await prisma.historicoEvento.createMany({
    data: [
      {
        demandaId: demandasCriadas[0].id,
        demandaTitulo: demandasCriadas[0].titulo,
        tipo: "CRIADA",
        descricao: "Demanda criada por Estoque (Estoque) para Almoxarifado, prioridade Alta.",
        usuarioNome: nomePorSetor.ESTOQUE,
        usuarioSetor: "ESTOQUE",
        exemplo: true,
        demandaSetorSolicitante: demandasCriadas[0].setorSolicitante,
        demandaSetorResponsavel: demandasCriadas[0].setorResponsavel,
      },
      {
        demandaId: demandasCriadas[1].id,
        demandaTitulo: demandasCriadas[1].titulo,
        tipo: "STATUS_ALTERADO",
        descricao: 'Situação alterada de "Pendente" para "Em andamento" por Almoxarifado (ALMOXARIFADO).',
        usuarioNome: nomePorSetor.ALMOXARIFADO,
        usuarioSetor: "ALMOXARIFADO",
        exemplo: true,
        demandaSetorSolicitante: demandasCriadas[1].setorSolicitante,
        demandaSetorResponsavel: demandasCriadas[1].setorResponsavel,
      },
      {
        demandaId: demandasCriadas[3].id,
        demandaTitulo: demandasCriadas[3].titulo,
        tipo: "STATUS_ALTERADO",
        descricao: 'Situação alterada de "Em andamento" para "Concluída" por Fundição (FUNDICAO).',
        usuarioNome: nomePorSetor.FUNDICAO,
        usuarioSetor: "FUNDICAO",
        exemplo: true,
        demandaSetorSolicitante: demandasCriadas[3].setorSolicitante,
        demandaSetorResponsavel: demandasCriadas[3].setorResponsavel,
      },
      {
        demandaId: demandasCriadas[6].id,
        demandaTitulo: demandasCriadas[6].titulo,
        tipo: "EDITADA",
        descricao: "Campos atualizados (descrição, prioridade) por Estoque (ESTOQUE).",
        usuarioNome: nomePorSetor.ESTOQUE,
        usuarioSetor: "ESTOQUE",
        exemplo: true,
        demandaSetorSolicitante: demandasCriadas[6].setorSolicitante,
        demandaSetorResponsavel: demandasCriadas[6].setorResponsavel,
      },
      {
        demandaId: demandasCriadas[6].id,
        demandaTitulo: demandasCriadas[6].titulo,
        tipo: "STATUS_ALTERADO",
        descricao: 'Situação alterada de "Pendente" para "Cancelada" por Estoque (ESTOQUE).',
        usuarioNome: nomePorSetor.ESTOQUE,
        usuarioSetor: "ESTOQUE",
        exemplo: true,
        demandaSetorSolicitante: demandasCriadas[6].setorSolicitante,
        demandaSetorResponsavel: demandasCriadas[6].setorResponsavel,
      },
    ],
  });

  console.log("Histórico de exemplo criado.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
