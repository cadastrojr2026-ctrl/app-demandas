// Gera um PDF com as demandas que tiveram baixa (entrega parcial) no período filtrado — mesmo
// formato do PDF de Demandas (src/lib/pdfDemandas.ts), mas mostrando só a quantidade
// efetivamente entregue em cada item, não a quantidade total registrada. Demandas sem nenhuma
// baixa no período não entram na lista.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildBaixasWhere, parseData } from "@/lib/producaoFiltro";
import { gerarPdfDemandas, type DemandaParaPdf } from "@/lib/pdfDemandas";

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
  const baixasWhere = buildBaixasWhere(searchParams, auth.session);
  const desde = parseData(searchParams.get("desde"), false);
  const ate = parseData(searchParams.get("ate"), true);

  const baixas = await prisma.itemBaixa.findMany({
    where: baixasWhere,
    select: {
      quantidade: true,
      item: {
        select: {
          codigo: true,
          demanda: {
            select: {
              id: true,
              titulo: true,
              descricao: true,
              observacao: true,
              produtos: true,
              setorSolicitante: true,
              setorResponsavel: true,
              prioridade: true,
              prazo: true,
              status: true,
              createdAt: true,
              criadoPor: { select: { nome: true } },
            },
          },
        },
      },
    },
  });

  // Agrupa as baixas do período por demanda + código — cada demanda aparece uma vez só no PDF,
  // com a soma do que foi entregue de cada item (não a quantidade total registrada nele).
  const porDemanda = new Map<
    number,
    { demanda: Omit<DemandaParaPdf, "itens">; itens: Map<string, number> }
  >();
  for (const b of baixas) {
    const { demanda } = b.item;
    const atual = porDemanda.get(demanda.id) ?? { demanda, itens: new Map<string, number>() };
    atual.itens.set(b.item.codigo, (atual.itens.get(b.item.codigo) ?? 0) + b.quantidade);
    porDemanda.set(demanda.id, atual);
  }

  const demandas: DemandaParaPdf[] = Array.from(porDemanda.values())
    .map(({ demanda, itens }) => ({
      ...demanda,
      itens: Array.from(itens.entries()).map(([codigo, quantidade]) => ({ codigo, quantidade })),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const pdf = await gerarPdfDemandas(demandas, {
    titulo: "Produção",
    subtitulo: `Gerado em ${new Date().toLocaleString("pt-BR")} · ${formatarPeriodo(desde, ate)} · ${demandas.length} demanda(s) com baixa.`,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="producao.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
