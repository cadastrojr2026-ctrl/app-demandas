-- CreateTable
CREATE TABLE "Notificacao" (
    "id" SERIAL NOT NULL,
    "paraUserId" INTEGER NOT NULL,
    "demandaId" INTEGER,
    "demandaTitulo" TEXT,
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacao_paraUserId_lida_idx" ON "Notificacao"("paraUserId", "lida");

-- CreateIndex
CREATE INDEX "Notificacao_createdAt_idx" ON "Notificacao"("createdAt");

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_paraUserId_fkey" FOREIGN KEY ("paraUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
