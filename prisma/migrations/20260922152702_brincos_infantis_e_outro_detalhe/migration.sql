-- AlterEnum
ALTER TYPE "TipoProduto" ADD VALUE 'BRINCOS_INFANTIS';

-- AlterTable
ALTER TABLE "Demanda" ADD COLUMN     "produtoOutroDetalhe" TEXT;
