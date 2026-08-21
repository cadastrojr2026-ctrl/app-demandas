import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Necessário para o driver da Neon funcionar em runtime Node.js (fora de edge/browser).
neonConfig.webSocketConstructor = ws;

// Evita criar múltiplas instâncias do PrismaClient durante hot-reload em dev.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não definida (configure no .env ou nas variáveis de ambiente).");
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Proxy: só conecta ao banco no primeiro uso real (ex: `prisma.demanda.findMany(...)`),
// nunca só por este arquivo ser importado/carregado. Isso evita quebrar o build (que carrega
// as rotas para inspecioná-las) caso DATABASE_URL não esteja disponível nesse momento.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient() as object, prop, receiver);
  },
});
