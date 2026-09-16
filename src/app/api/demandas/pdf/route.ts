// Gera um PDF com a lista de demandas de acordo com os mesmos filtros aplicados na tela
// (status, responsável, solicitante, prioridade, texto, "só as minhas") — usa o mesmo
// "where" da listagem (src/lib/demandasFiltro.ts) pra nunca divergir do que está na tela.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildDemandasWhere } from "@/lib/demandasFiltro";
import { gerarPdfDemandas } from "@/lib/pdfDemandas";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const where = buildDemandasWhere(searchParams, auth.session);

  const demandas = await prisma.demanda.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      criadoPor: { select: { nome: true } },
      itens: { select: { codigo: true, quantidade: true } },
    },
  });

  const pdf = await gerarPdfDemandas(demandas, {
    titulo: "Demandas",
    subtitulo: `Gerado em ${new Date().toLocaleString("pt-BR")} · ${demandas.length} demanda(s) — de acordo com os filtros aplicados.`,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="demandas.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
