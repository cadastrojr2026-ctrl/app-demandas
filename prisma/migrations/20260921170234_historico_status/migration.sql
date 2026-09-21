-- AlterTable
ALTER TABLE "HistoricoEvento" ADD COLUMN     "statusAnterior" "StatusDemanda",
ADD COLUMN     "statusNovo" "StatusDemanda";

-- CreateIndex
CREATE INDEX "HistoricoEvento_statusNovo_idx" ON "HistoricoEvento"("statusNovo");
