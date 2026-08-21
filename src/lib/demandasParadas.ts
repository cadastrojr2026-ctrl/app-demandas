import { prisma } from "@/lib/prisma";
import { enviarWhatsApp } from "@/lib/whatsapp";
import { SETOR_LABEL } from "@/lib/constants";

// Demanda de prioridade ALTA "parada" = sem mudança de situação há mais de X horas.
const HORAS_PARA_CONSIDERAR_PARADA = 24;
// Não reenviar alerta da mesma demanda antes de passar esse intervalo mínimo, mesmo que a
// checagem rode com mais frequência (ex: via cron externo a cada poucas horas).
const HORAS_MINIMAS_ENTRE_ALERTAS = 24;

function formatarData(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export interface VerificacaoParadasResultado {
  encontradas: number;
  notificadas: number;
  falhas: { demandaId: number; erro: string }[];
}

/**
 * Verifica demandas de prioridade ALTA sem mudança de situação há mais de
 * HORAS_PARA_CONSIDERAR_PARADA horas e dispara um alerta de WhatsApp para cada uma que ainda
 * não foi notificada nas últimas HORAS_MINIMAS_ENTRE_ALERTAS horas.
 */
export async function verificarDemandasParadas(): Promise<VerificacaoParadasResultado> {
  const limiteParada = new Date(Date.now() - HORAS_PARA_CONSIDERAR_PARADA * 60 * 60 * 1000);
  const limiteReenvio = new Date(Date.now() - HORAS_MINIMAS_ENTRE_ALERTAS * 60 * 60 * 1000);

  const paradas = await prisma.demanda.findMany({
    where: {
      prioridade: "ALTA",
      status: { in: ["PENDENTE", "EM_ANDAMENTO"] },
      updatedAt: { lt: limiteParada },
      OR: [{ ultimoAlertaParadaEm: null }, { ultimoAlertaParadaEm: { lt: limiteReenvio } }],
    },
    include: { criadoPor: { select: { nome: true, setor: true } } },
    orderBy: [{ updatedAt: "asc" }],
  });

  const falhas: { demandaId: number; erro: string }[] = [];
  let notificadas = 0;

  for (const d of paradas) {
    const texto =
      `⚠️ Demanda de alta prioridade parada há mais de ${HORAS_PARA_CONSIDERAR_PARADA}h:\n` +
      `"${d.titulo}"\n` +
      `De ${SETOR_LABEL[d.setorSolicitante]} para ${SETOR_LABEL[d.setorResponsavel]} — situação atual: ${d.status}.\n` +
      `Sem atualização desde ${formatarData(d.updatedAt)}.`;

    const resultado = await enviarWhatsApp(texto);
    if (!resultado.enviado) {
      falhas.push({ demandaId: d.id, erro: resultado.erro });
      continue;
    }

    await prisma.demanda.update({
      where: { id: d.id },
      data: { ultimoAlertaParadaEm: new Date() },
    });
    notificadas += 1;
  }

  return { encontradas: paradas.length, notificadas, falhas };
}
