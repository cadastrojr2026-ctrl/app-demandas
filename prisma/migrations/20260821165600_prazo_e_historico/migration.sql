-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('CRIADA', 'EDITADA', 'STATUS_ALTERADO', 'EXCLUIDA');

-- AlterTable
ALTER TABLE "Demanda" ADD COLUMN     "prazo" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "HistoricoEvento" (
    "id" SERIAL NOT NULL,
    "demandaId" INTEGER NOT NULL,
    "demandaTitulo" TEXT NOT NULL,
    "tipo" "TipoEvento" NOT NULL,
    "descricao" TEXT NOT NULL,
    "usuarioNome" TEXT NOT NULL,
    "usuarioSetor" "Setor" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoEvento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HistoricoEvento_demandaId_idx" ON "HistoricoEvento"("demandaId");

-- CreateIndex
CREATE INDEX "HistoricoEvento_createdAt_idx" ON "HistoricoEvento"("createdAt");
