// Gera um PDF com as demandas do período filtrado em Produção, no mesmo formato do PDF de
// Demandas (src/lib/pdfDemandas.ts) — tabela completa + totalizadores de peças/códigos/demandas.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildProducaoWhere, parseData } from "@/lib/producaoFiltro";
import { gerarPdfDemandas } from "@/lib/pdfDemandas";

function formatarPeriodo(desde: Date | undefined, ate: Date | undefined) {
  if (!desde && !ate) return "todo o período";
  const fmt = (d: Date) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
  if (desde && ate) return `${fmt(desde)} a ${fmt(ate)}`;
  if (desde) return `a partir de ${fmt(desde)}`;
  return `até ${fmt(ate!)}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const where = buildProducaoWhere(searchParams, auth.session);
  const desde = parseData(searchParams.get("desde"), false);
  const ate = parseData(searchParams.get("ate"), true);

  const demandas = await prisma.demanda.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      criadoPor: { select: { nome: true } },
      itens: { select: { codigo: true, quantidade: true } },
    },
  });

  const pdf = await gerarPdfDemandas(demandas, {
    titulo: "Produção",
    subtitulo: `Gerado em ${new Date().toLocaleString("pt-BR")} · ${formatarPeriodo(desde, ate)} · ${demandas.length} demanda(s).`,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="producao.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
