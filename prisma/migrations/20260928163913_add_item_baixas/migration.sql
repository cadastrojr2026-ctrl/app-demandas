-- CreateTable
CREATE TABLE "ItemBaixa" (
    "id" SERIAL NOT NULL,
    "itemProduzidoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "criadoPorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemBaixa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ItemBaixa_itemProduzidoId_idx" ON "ItemBaixa"("itemProduzidoId");

-- CreateIndex
CREATE INDEX "ItemBaixa_createdAt_idx" ON "ItemBaixa"("createdAt");

-- AddForeignKey
ALTER TABLE "ItemBaixa" ADD CONSTRAINT "ItemBaixa_itemProduzidoId_fkey" FOREIGN KEY ("itemProduzidoId") REFERENCES "ItemProduzido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemBaixa" ADD CONSTRAINT "ItemBaixa_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
