// Gera o PDF do histórico de eventos — mesma linguagem visual do PDF de demandas
// (src/lib/pdfDemandas.ts): cabeçalho com marca, selo colorido pro tipo de evento, linhas
// zebradas. Colunas: Data | Demanda | Tipo | Setor | Descrição.
import PDFDocument from "pdfkit";
import { SETOR_LABEL, TIPO_EVENTO_LABEL } from "@/lib/constants";
import type { Setor, TipoEvento } from "@/generated/prisma/client";

export interface HistoricoEventoParaPdf {
  demandaTitulo: string;
  tipo: TipoEvento;
  descricao: string;
  usuarioNome: string;
  usuarioSetor: Setor;
  createdAt: Date;
}

// Mesmas cores de TIPO_EVENTO_BADGE_CLASS em src/lib/constants.ts, em hex.
const COR_TIPO: Record<TipoEvento, { fundo: string; texto: string }> = {
  CRIADA: { fundo: "#d1fae5", texto: "#065f46" },
  EDITADA: { fundo: "#e0f2fe", texto: "#075985" },
  STATUS_ALTERADO: { fundo: "#dbeafe", texto: "#1e40af" },
  EXCLUIDA: { fundo: "#fee2e2", texto: "#991b1b" },
};

const COLUNAS = [
  { titulo: "Data", x: 40, largura: 65 },
  { titulo: "Demanda", x: 110, largura: 150 },
  { titulo: "Tipo", x: 265, largura: 95 },
  { titulo: "Setor", x: 365, largura: 80 },
  { titulo: "Descrição", x: 450, largura: 345 },
];

function formatarData(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export async function gerarPdfHistorico(
  eventos: HistoricoEventoParaPdf[],
  opcoes: { subtitulo: string }
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40, layout: "landscape" });
  const partes: Buffer[] = [];
  doc.on("data", (parte) => partes.push(parte));
  const finalizado = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(partes))));

  const margemEsq = doc.page.margins.left;
  const margemDir = doc.page.margins.right;
  const larguraConteudo = doc.page.width - margemEsq - margemDir;
  const limiteY = doc.page.height - doc.page.margins.bottom;

  function selo(texto: string, x: number, y: number, cor: { fundo: string; texto: string }) {
    doc.font("Helvetica-Bold").fontSize(8);
    const largura = doc.widthOfString(texto) + 12;
    doc.roundedRect(x, y, largura, 15, 7.5).fill(cor.fundo);
    doc.fillColor(cor.texto).text(texto, x, y + 3.3, { width: largura, align: "center" });
    doc.font("Helvetica");
  }

  function cabecalhoPagina() {
    doc.rect(0, 0, doc.page.width, 5).fill("#b45309");
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#a8a29e").text("JR JOIAS FOLHEADAS", margemEsq, 28);
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#1c1917").text("Histórico", margemEsq, 42);
    doc.font("Helvetica").fontSize(9).fillColor("#78716c").text(opcoes.subtitulo, margemEsq, 68);
    doc
      .moveTo(margemEsq, 86)
      .lineTo(doc.page.width - margemDir, 86)
      .lineWidth(1.2)
      .strokeColor("#1c1917")
      .stroke();
    doc.lineWidth(1);
    doc.y = 96;
  }

  function cabecalhoTabela() {
    // y fixo capturado antes do loop — ver nota equivalente em pdfDemandas.ts. doc.text()
    // move doc.y sozinho depois de desenhar, então reusar "doc.y" dentro do loop faz cada
    // título de coluna ficar mais baixo que o anterior.
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#78716c");
    const headerY = doc.y;
    for (const c of COLUNAS) {
      doc.text(c.titulo.toUpperCase(), c.x, headerY, { width: c.largura });
    }
    doc.font("Helvetica");
    const y = headerY + 12;
    doc
      .moveTo(margemEsq, y)
      .lineTo(doc.page.width - margemDir, y)
      .strokeColor("#d6d3d1")
      .stroke();
    doc.y = y + 8;
  }

  function novaPagina() {
    doc.addPage({ size: "A4", margin: 40, layout: "landscape" });
    cabecalhoPagina();
    cabecalhoTabela();
  }

  cabecalhoPagina();
  cabecalhoTabela();

  const LARGURA_DESC = COLUNAS[4].largura;

  eventos.forEach((ev, indice) => {
    // Mede com a MESMA fonte usada pra desenhar (normal, aqui) — medir com uma fonte e
    // desenhar com outra mais larga faz o pdfkit cortar o texto no meio (já vimos esse bug
    // no PDF de demandas: negrito precisa ser medido em negrito).
    const alturaDemanda = doc.fontSize(9).heightOfString(ev.demandaTitulo, { width: COLUNAS[1].largura });
    const alturaDesc = doc.fontSize(8).heightOfString(ev.descricao, { width: LARGURA_DESC });
    const alturaLinha = Math.max(alturaDemanda, alturaDesc, 15) + 10;

    if (doc.y + alturaLinha > limiteY) {
      novaPagina();
    }

    const y = doc.y;
    if (indice % 2 === 1) {
      doc.rect(margemEsq - 4, y - 3, larguraConteudo + 8, alturaLinha).fill("#fafaf9");
    }

    doc
      .fontSize(9)
      .fillColor("#1c1917")
      .text(formatarData(ev.createdAt), COLUNAS[0].x, y, { width: COLUNAS[0].largura });
    doc
      .fontSize(9)
      .fillColor("#1c1917")
      .text(ev.demandaTitulo, COLUNAS[1].x, y, { width: COLUNAS[1].largura, height: alturaDemanda });
    selo(TIPO_EVENTO_LABEL[ev.tipo], COLUNAS[2].x, y, COR_TIPO[ev.tipo]);
    doc
      .fontSize(9)
      .fillColor("#1c1917")
      .text(`${SETOR_LABEL[ev.usuarioSetor]}\n${ev.usuarioNome}`, COLUNAS[3].x, y, { width: COLUNAS[3].largura });
    doc
      .fontSize(8)
      .fillColor("#57534e")
      .text(ev.descricao, COLUNAS[4].x, y, { width: LARGURA_DESC, height: alturaDesc });

    doc.y = y + alturaLinha;
  });

  doc.end();
  return finalizado;
}
