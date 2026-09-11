-- AlterEnum
ALTER TYPE "StatusDemanda" ADD VALUE 'ENTREGUE';

-- AlterTable
ALTER TABLE "Demanda" ADD COLUMN     "observacao" TEXT;
