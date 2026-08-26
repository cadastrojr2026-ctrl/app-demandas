-- AlterTable
ALTER TABLE "HistoricoEvento" ADD COLUMN     "demandaSetorResponsavel" "Setor",
ADD COLUMN     "demandaSetorSolicitante" "Setor";

-- CreateIndex
CREATE INDEX "HistoricoEvento_demandaSetorSolicitante_idx" ON "HistoricoEvento"("demandaSetorSolicitante");

-- CreateIndex
CREATE INDEX "HistoricoEvento_demandaSetorResponsavel_idx" ON "HistoricoEvento"("demandaSetorResponsavel");
