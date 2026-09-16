-- CreateTable
CREATE TABLE "ItemProduzido" (
    "id" SERIAL NOT NULL,
    "demandaId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemProduzido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemProduzido_demandaId_idx" ON "ItemProduzido"("demandaId");

-- CreateIndex
CREATE INDEX "ItemProduzido_codigo_idx" ON "ItemProduzido"("codigo");

-- AddForeignKey
ALTER TABLE "ItemProduzido" ADD CONSTRAINT "ItemProduzido_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "Demanda"("id") ON DELETE CASCADE ON UPDATE CASCADE;
