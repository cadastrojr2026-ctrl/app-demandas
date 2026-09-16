// Gera um PDF com a lista de demandas de acordo com os mesmos filtros aplicados na tela
// (status, responsável, solicitante, prioridade, texto, "só as minhas") — usa o mesmo
// "where" da listagem (src/lib/demandasFiltro.ts) pra nunca divergir do que está na tela.
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildDemandasWhere } from "@/lib/demandasFiltro";
import { PRIORIDADE_LABEL, PRODUTO_LABEL, SETOR_LABEL, STATUS_LABEL } from "@/lib/constants";

const COLUNAS = [
  { titulo: "Demanda", x: 40, largura: 175 },
  { titulo: "Solicitante", x: 220, largura: 75 },
  { titulo: "Responsável", x: 300, largura: 75 },
  { titulo: "Prioridade", x: 380, largura: 60 },
  { titulo: "Prazo", x: 445, largura: 55 },
  { titulo: "Status", x: 505, largura: 85 },
  { titulo: "Criado por / em", x: 595, largura: 115 },
];

function formatarData(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
}

function formatarPrazo(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const where = buildDemandasWhere(searchParams, auth.session);

  const demandas = await prisma.demanda.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      criadoPor: { select: { id: true, nome: true, setor: true } },
    },
  });

  const doc = new PDFDocument({ size: "A4", margin: 40, layout: "landscape" });
  const partes: Buffer[] = [];
  doc.on("data", (parte) => partes.push(parte));
  const finalizado = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(partes))));

  const limiteY = doc.page.height - doc.page.margins.bottom;

  function cabecalho() {
    // Usa um y fixo (capturado antes do loop) pra todas as colunas — chamar doc.text() move
    // doc.y pra baixo do texto desenhado, então usar "doc.y" dentro do loop faz cada título
    // ficar mais baixo que o anterior (título indo em "escada" em vez de alinhado).
    doc.fontSize(9).fillColor("#57534e");
    const headerY = doc.y;
    for (const c of COLUNAS) {
      doc.text(c.titulo, c.x, headerY, { width: c.largura });
    }
    const y = headerY + 12;
    doc
      .moveTo(40, y)
      .lineTo(doc.page.width - doc.page.margins.right, y)
      .strokeColor("#d6d3d1")
      .stroke();
    doc.y = y + 6;
  }

  doc.fontSize(18).fillColor("#1c1917").text("Demandas");
  doc.moveDown(0.2);
  doc
    .fontSize(9)
    .fillColor("#57534e")
    .text(`Gerado em ${new Date().toLocaleString("pt-BR")} · ${demandas.length} demanda(s) — de acordo com os filtros aplicados.`);
  doc.moveDown(0.8);

  cabecalho();

  // Mostra descrição/observação/produtos por inteiro (sem cortar com "…") — pra isso, calcula
  // a altura real de cada bloco (doc.heightOfString, mesma fonte/largura do desenho) e passa
  // essa altura exata pro doc.text() de cada um. Com uma altura explícita e correta, o pdfkit
  // nunca precisa decidir sozinho se quebra página no meio do texto — ele só usa o espaço que
  // a gente já reservou, e a decisão de quebrar página continua 100% nossa (o if abaixo).
  const LARGURA_DEMANDA = COLUNAS[0].largura;
  const GAP = 3;

  for (const d of demandas) {
    const produtosTexto =
      d.produtos.length > 0 ? `Produtos: ${d.produtos.map((p) => PRODUTO_LABEL[p]).join(", ")}` : "";

    const alturaTitulo = doc.fontSize(9).heightOfString(d.titulo, { width: LARGURA_DEMANDA });
    const alturaDescricao = d.descricao ? doc.fontSize(8).heightOfString(d.descricao, { width: LARGURA_DEMANDA }) : 0;
    const alturaObs = d.observacao
      ? doc.fontSize(8).heightOfString(`Obs: ${d.observacao}`, { width: LARGURA_DEMANDA })
      : 0;
    const alturaProdutos = produtosTexto ? doc.fontSize(8).heightOfString(produtosTexto, { width: LARGURA_DEMANDA }) : 0;

    const alturaLinha =
      alturaTitulo +
      (d.descricao ? GAP + alturaDescricao : 0) +
      (d.observacao ? GAP + alturaObs : 0) +
      (produtosTexto ? GAP + alturaProdutos : 0) +
      8;

    if (doc.y + alturaLinha > limiteY) {
      doc.addPage({ size: "A4", margin: 40, layout: "landscape" });
      cabecalho();
    }

    const y = doc.y;
    let cursor = y;
    doc
      .fontSize(9)
      .fillColor("#1c1917")
      .text(d.titulo, COLUNAS[0].x, cursor, { width: LARGURA_DEMANDA, height: alturaTitulo });
    cursor += alturaTitulo;
    if (d.descricao) {
      cursor += GAP;
      doc
        .fontSize(8)
        .fillColor("#78716c")
        .text(d.descricao, COLUNAS[0].x, cursor, { width: LARGURA_DEMANDA, height: alturaDescricao });
      cursor += alturaDescricao;
    }
    if (d.observacao) {
      cursor += GAP;
      doc
        .fontSize(8)
        .fillColor("#b91c1c")
        .text(`Obs: ${d.observacao}`, COLUNAS[0].x, cursor, { width: LARGURA_DEMANDA, height: alturaObs });
      cursor += alturaObs;
    }
    if (produtosTexto) {
      cursor += GAP;
      doc
        .fontSize(8)
        .fillColor("#78716c")
        .text(produtosTexto, COLUNAS[0].x, cursor, { width: LARGURA_DEMANDA, height: alturaProdutos });
      cursor += alturaProdutos;
    }

    doc.fontSize(9).fillColor("#1c1917");
    doc.text(SETOR_LABEL[d.setorSolicitante], COLUNAS[1].x, y, { width: COLUNAS[1].largura });
    doc.text(SETOR_LABEL[d.setorResponsavel], COLUNAS[2].x, y, { width: COLUNAS[2].largura });
    doc.text(PRIORIDADE_LABEL[d.prioridade], COLUNAS[3].x, y, { width: COLUNAS[3].largura });
    doc.text(d.prazo ? formatarPrazo(d.prazo) : "—", COLUNAS[4].x, y, { width: COLUNAS[4].largura });
    doc.font("Helvetica-Bold").text(STATUS_LABEL[d.status], COLUNAS[5].x, y, { width: COLUNAS[5].largura });
    doc.font("Helvetica").text(`${d.criadoPor.nome}\n${formatarData(d.createdAt)}`, COLUNAS[6].x, y, { width: COLUNAS[6].largura });

    doc.y = y + alturaLinha;
  }

  doc.end();
  const pdf = await finalizado;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="demandas.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
