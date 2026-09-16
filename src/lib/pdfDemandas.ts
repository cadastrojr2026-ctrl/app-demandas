// Gera o PDF de uma lista de demandas — mesmo formato usado tanto no "Gerar PDF" da tela de
// Demandas quanto no da tela de Produção, pra nunca os dois divergirem visualmente. Mostra a
// tabela de demandas por inteiro (sem truncar descrição/observação/produtos), com status e
// prioridade como selos coloridos (mesmas cores da tela), linhas zebradas pra facilitar a
// leitura, e termina com três cartões de resumo: quantas demandas, quantas peças produzidas
// (soma dos itens) e quantos códigos de peça diferentes.
import PDFDocument from "pdfkit";
import { PRIORIDADE_LABEL, PRODUTO_LABEL, SETOR_LABEL, STATUS_LABEL } from "@/lib/constants";
import type { Prioridade, Setor, StatusDemanda, TipoProduto } from "@/generated/prisma/client";

export interface DemandaParaPdf {
  titulo: string;
  descricao: string | null;
  observacao: string | null;
  produtos: TipoProduto[];
  setorSolicitante: Setor;
  setorResponsavel: Setor;
  prioridade: Prioridade;
  prazo: Date | null;
  status: StatusDemanda;
  createdAt: Date;
  criadoPor: { nome: string };
  itens: { codigo: string; quantidade: number }[];
}

// Mesmas cores dos selos da tela (STATUS_BADGE_CLASS / PRIORIDADE_BADGE_CLASS em
// src/lib/constants.ts), só que em hex — o pdfkit não entende classes Tailwind.
const COR_STATUS: Record<StatusDemanda, { fundo: string; texto: string }> = {
  PENDENTE: { fundo: "#fef3c7", texto: "#92400e" },
  EM_ANDAMENTO: { fundo: "#dbeafe", texto: "#1e40af" },
  ENTREGUE: { fundo: "#ede9fe", texto: "#5b21b6" },
  CONCLUIDA: { fundo: "#d1fae5", texto: "#065f46" },
  CANCELADA: { fundo: "#e5e5e5", texto: "#404040" },
};

const COR_PRIORIDADE: Record<Prioridade, { fundo: string; texto: string }> = {
  ALTA: { fundo: "#fee2e2", texto: "#991b1b" },
  MEDIA: { fundo: "#e0f2fe", texto: "#075985" },
  BAIXA: { fundo: "#f5f5f5", texto: "#404040" },
};

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

export async function gerarPdfDemandas(
  demandas: DemandaParaPdf[],
  opcoes: { titulo: string; subtitulo: string }
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40, layout: "landscape" });
  const partes: Buffer[] = [];
  doc.on("data", (parte) => partes.push(parte));
  const finalizado = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(partes))));

  const margemEsq = doc.page.margins.left;
  const margemDir = doc.page.margins.right;
  const larguraConteudo = doc.page.width - margemEsq - margemDir;
  const limiteY = doc.page.height - doc.page.margins.bottom;

  // Selo colorido (status/prioridade) — largura do próprio texto, não da coluna, pra parecer
  // uma etiqueta de verdade em vez de uma barra esticada.
  function selo(texto: string, x: number, y: number, cor: { fundo: string; texto: string }) {
    doc.font("Helvetica-Bold").fontSize(8);
    const largura = doc.widthOfString(texto) + 12;
    doc.roundedRect(x, y, largura, 15, 7.5).fill(cor.fundo);
    doc.fillColor(cor.texto).text(texto, x, y + 3.3, { width: largura, align: "center" });
    doc.font("Helvetica");
  }

  function cabecalhoPagina() {
    // Faixa dourada no topo — só um toque de marca, discreto.
    doc.rect(0, 0, doc.page.width, 5).fill("#b45309");

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#a8a29e").text("JR JOIAS FOLHEADAS", margemEsq, 28);
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#1c1917").text(opcoes.titulo, margemEsq, 42);
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
    // Usa um y fixo (capturado antes do loop) pra todas as colunas — chamar doc.text() move
    // doc.y pra baixo do texto desenhado, então usar "doc.y" dentro do loop faz cada título
    // ficar mais baixo que o anterior (título indo em "escada" em vez de alinhado).
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

  // Mostra descrição/observação/produtos por inteiro (sem cortar com "…") — pra isso, calcula
  // a altura real de cada bloco (doc.heightOfString, mesma fonte/largura do desenho) e passa
  // essa altura exata pro doc.text() de cada um. Com uma altura explícita e correta, o pdfkit
  // nunca precisa decidir sozinho se quebra página no meio do texto — ele só usa o espaço que
  // a gente já reservou, e a decisão de quebrar página continua 100% nossa (o if abaixo).
  const LARGURA_DEMANDA = COLUNAS[0].largura;
  const GAP = 3;

  demandas.forEach((d, indice) => {
    const produtosTexto =
      d.produtos.length > 0 ? `Produtos: ${d.produtos.map((p) => PRODUTO_LABEL[p]).join(", ")}` : "";

    const alturaTitulo = doc.fontSize(9).heightOfString(d.titulo, { width: LARGURA_DEMANDA });
    const alturaDescricao = d.descricao ? doc.fontSize(8).heightOfString(d.descricao, { width: LARGURA_DEMANDA }) : 0;
    const alturaObs = d.observacao
      ? doc.fontSize(8).heightOfString(`Obs: ${d.observacao}`, { width: LARGURA_DEMANDA })
      : 0;
    const alturaProdutos = produtosTexto ? doc.fontSize(8).heightOfString(produtosTexto, { width: LARGURA_DEMANDA }) : 0;

    const alturaConteudo =
      alturaTitulo +
      (d.descricao ? GAP + alturaDescricao : 0) +
      (d.observacao ? GAP + alturaObs : 0) +
      (produtosTexto ? GAP + alturaProdutos : 0);
    const alturaLinha = Math.max(alturaConteudo, 15) + 10;

    if (doc.y + alturaLinha > limiteY) {
      novaPagina();
    }

    const y = doc.y;

    // Linhas pares com um fundo bem sutil, só pra guiar o olho ao ler a tabela inteira.
    if (indice % 2 === 1) {
      doc.rect(margemEsq - 4, y - 3, larguraConteudo + 8, alturaLinha).fill("#fafaf9");
    }

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
    selo(PRIORIDADE_LABEL[d.prioridade], COLUNAS[3].x, y, COR_PRIORIDADE[d.prioridade]);
    doc.fontSize(9).fillColor("#1c1917").text(d.prazo ? formatarPrazo(d.prazo) : "—", COLUNAS[4].x, y, { width: COLUNAS[4].largura });
    selo(STATUS_LABEL[d.status], COLUNAS[5].x, y, COR_STATUS[d.status]);
    doc
      .fontSize(9)
      .fillColor("#1c1917")
      .text(`${d.criadoPor.nome}\n${formatarData(d.createdAt)}`, COLUNAS[6].x, y, { width: COLUNAS[6].largura });

    doc.y = y + alturaLinha;
  });

  // Cartões de resumo: quantas demandas, quantas peças produzidas (soma dos itens) e quantos
  // códigos de peça diferentes — mesmos três números da tela de Produção, num formato mais
  // fácil de ler de longe do que três linhas de texto soltas.
  const todosItens = demandas.flatMap((d) => d.itens);
  const totalPecas = todosItens.reduce((soma, i) => soma + i.quantidade, 0);
  const codigosDistintos = new Set(todosItens.map((i) => i.codigo)).size;

  const CARTAO_ALTURA = 58;
  const CARTAO_GAP = 16;
  const CARTAO_LARGURA = (larguraConteudo - CARTAO_GAP * 2) / 3;

  if (doc.y + 20 + CARTAO_ALTURA > limiteY) {
    novaPagina();
  }
  doc.y += 20;

  const cartoes = [
    { rotulo: "DEMANDAS", valor: demandas.length },
    { rotulo: "ITENS PRODUZIDOS", valor: totalPecas },
    { rotulo: "CÓDIGOS DIFERENTES", valor: codigosDistintos },
  ];

  // Mesmo y fixo pros três — cada doc.text() abaixo move doc.y sozinho pra debaixo do texto
  // desenhado, então ler "doc.y" de novo a cada volta do loop faria o 2º e o 3º cartão
  // escorregarem pra baixo (e até pra próxima página) em vez de ficarem lado a lado.
  const yCartoes = doc.y;
  cartoes.forEach((c, i) => {
    const x = margemEsq + i * (CARTAO_LARGURA + CARTAO_GAP);
    const y = yCartoes;
    doc.roundedRect(x, y, CARTAO_LARGURA, CARTAO_ALTURA, 8).lineWidth(1).strokeColor("#e7e5e4").stroke();
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#78716c")
      .text(c.rotulo, x + 16, y + 14, { width: CARTAO_LARGURA - 32 });
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#1c1917")
      .text(String(c.valor), x + 16, y + 27, { width: CARTAO_LARGURA - 32 });
  });
  doc.y += CARTAO_ALTURA;

  doc.end();
  return finalizado;
}
