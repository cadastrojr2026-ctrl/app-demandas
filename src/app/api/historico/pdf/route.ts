// Gera um PDF com os eventos do histórico de acordo com os mesmos filtros aplicados na tela
// (período, setor, situação resultante) — usa o mesmo "where" da listagem
// (src/lib/historicoFiltro.ts) pra nunca divergir do que está na tela.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildHistoricoWhere, parseData } from "@/lib/historicoFiltro";
import { gerarPdfHistorico } from "@/lib/pdfHistorico";

function formatarPeriodo(desde: Date | undefined, ate: Date | undefined) {
  if (!desde && !ate) return "todo o período";
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
  if (desde && ate) return `${fmt(desde)} a ${fmt(ate)}`;
  if (desde) return `a partir de ${fmt(desde)}`;
  return `até ${fmt(ate!)}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const where = buildHistoricoWhere(searchParams, auth.session);
  const desde = parseData(searchParams.get("desde"), false);
  const ate = parseData(searchParams.get("ate"), true);

  const eventos = await prisma.historicoEvento.findMany({
    where,
    orderBy: [{ id: "desc" }],
    take: 1000,
  });

  const pdf = await gerarPdfHistorico(eventos, {
    subtitulo: `Gerado em ${new Date().toLocaleString("pt-BR")} · ${formatarPeriodo(desde, ate)} · ${eventos.length} evento(s) — de acordo com os filtros aplicados.`,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="historico.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
