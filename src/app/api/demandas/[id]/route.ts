import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { registrarEvento } from "@/lib/historico";
import { enviarWhatsApp } from "@/lib/whatsapp";
import { notificarAdmins, notificarSetor } from "@/lib/notificacoes";
import { itensSchema } from "@/lib/itemProduzido";
import { SETOR_LABEL, STATUS_LABEL } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";

// Estoque só solicita — nunca é o setor responsável por atender uma demanda.
const SETOR_RESPONSAVEL_VALUES = ["ALMOXARIFADO", "FUNDICAO"] as const;
const STATUS_VALUES = ["PENDENTE", "EM_ANDAMENTO", "ENTREGUE", "CONCLUIDA", "CANCELADA"] as const;
const PRIORIDADE_VALUES = ["BAIXA", "MEDIA", "ALTA"] as const;
const PRODUTO_VALUES = [
  "ANEL",
  "ARGOLA",
  "BRINCO_FIXO",
  "BRINCO_MEDIO",
  "BRINCOS_INFANTIS",
  "CONJUNTOS",
  "CORRENTARIA",
  "ESCAPULARIO",
  "GARGANTILHA",
  "PINGENTE",
  "PULSEIRA",
  "TERCO",
  "TORNOZELEIRA",
  "OUTROS",
] as const;

const dataOpcional = z
  .string()
  .trim()
  .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Data inválida.")
  .optional()
  .nullable();

const patchSchema = z
  .object({
    titulo: z.string().trim().min(3, "Título muito curto.").max(200).optional(),
    descricao: z.string().trim().max(2000).optional().nullable(),
    observacao: z.string().trim().max(2000).optional().nullable(),
    setorResponsavel: z.enum(SETOR_RESPONSAVEL_VALUES).optional(),
    prioridade: z.enum(PRIORIDADE_VALUES).optional(),
    prazo: dataOpcional,
    produtos: z.array(z.enum(PRODUTO_VALUES)).optional(),
    produtoOutroDetalhe: z.string().trim().max(200).optional().nullable(),
    status: z.enum(STATUS_VALUES).optional(),
    itens: itensSchema,
  })
  .refine((data) => Object.keys(data).length > 0, { message: "Nada para atualizar." });

const CAMPO_LABEL: Record<string, string> = {
  titulo: "título",
  descricao: "descrição",
  observacao: "observação",
  setorResponsavel: "setor responsável",
  prioridade: "prioridade",
  prazo: "prazo",
  produtos: "produtos",
  produtoOutroDetalhe: "detalhe do 'Outros'",
  status: "status",
  itens: "itens produzidos",
};

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Busca uma demanda específica — usado pelo link "abrir demanda" no histórico (a linha só
// guarda o id, não a demanda inteira). Mesma regra de visibilidade da listagem: Estoque
// (admin) vê qualquer uma, Almoxarifado e Fundição só as do próprio setor.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const demanda = await prisma.demanda.findUnique({
    where: { id },
    include: {
      criadoPor: { select: { id: true, nome: true, setor: true } },
      itens: { orderBy: { id: "asc" }, select: { id: true, codigo: true, quantidade: true } },
    },
  });
  if (!demanda) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });

  const { session } = auth;
  const podeVer =
    session.role === "ADMIN" ||
    demanda.setorSolicitante === session.setor ||
    demanda.setorResponsavel === session.setor;
  if (!podeVer) {
    return NextResponse.json({ error: "Você não tem acesso a esta demanda." }, { status: 403 });
  }

  return NextResponse.json({ demanda });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const demanda = await prisma.demanda.findUnique({ where: { id } });
  if (!demanda) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });

  const { session } = auth;
  const isAdmin = session.role === "ADMIN";
  const isCriador = demanda.criadoPorId === session.userId;
  const isResponsavel = demanda.setorResponsavel === session.setor;

  const canEditFull = isAdmin || isCriador;
  const canChangeStatus = canEditFull || isResponsavel;

  // Quem não pode editar a demanda inteira (não é admin nem criador), mas é do setor
  // responsável por atendê-la, ainda pode mudar o status (já valia), editar a observação e
  // registrar os itens produzidos — sem tocar em título, descrição, prazo, etc. (esses três
  // campos podem ser mandados juntos ou separados, sempre sem mexer nos outros).
  const CAMPOS_RESTRITOS = new Set(["status", "observacao", "itens"]);
  const changedKeys = Object.keys(parsed.data);
  const somenteStatus = changedKeys.length === 1 && changedKeys[0] === "status";
  const somenteCampoRestrito = changedKeys.every((k) => CAMPOS_RESTRITOS.has(k));
  const permitido = somenteCampoRestrito ? canChangeStatus : canEditFull;

  if (!permitido) {
    return NextResponse.json(
      { error: "Você não tem permissão para editar esta demanda." },
      { status: 403 }
    );
  }

  // Só o administrador (Estoque) pode marcar uma demanda como concluída.
  if (parsed.data.status === "CONCLUIDA" && !isAdmin) {
    return NextResponse.json(
      { error: "Somente o administrador pode marcar uma demanda como concluída." },
      { status: 403 }
    );
  }

  const { prazo, itens, ...resto } = parsed.data;
  const data: Prisma.DemandaUpdateInput = { ...resto };
  if ("prazo" in parsed.data) {
    data.prazo = prazo ? new Date(prazo) : null;
  }
  if (itens !== undefined) {
    // Substitui o conjunto inteiro de itens (mesma lógica de "produtos": o formulário sempre
    // manda a lista completa, não um item por vez) — apaga os antigos e cria os novos.
    data.itens = { deleteMany: {}, create: itens };
  }

  const setorResponsavelFinal = data.setorResponsavel ?? demanda.setorResponsavel;
  if (setorResponsavelFinal === demanda.setorSolicitante) {
    return NextResponse.json(
      { error: "O setor responsável deve ser diferente do setor solicitante." },
      { status: 400 }
    );
  }

  const atualizada = await prisma.demanda.update({
    where: { id },
    data,
    include: {
      criadoPor: { select: { id: true, nome: true, setor: true } },
      itens: { orderBy: { id: "asc" }, select: { id: true, codigo: true, quantidade: true } },
    },
  });

  if (somenteStatus) {
    await registrarEvento({
      demandaId: atualizada.id,
      demandaTitulo: atualizada.titulo,
      tipo: "STATUS_ALTERADO",
      descricao: `Situação alterada de "${STATUS_LABEL[demanda.status]}" para "${STATUS_LABEL[atualizada.status]}" por ${session.nome} (${session.setor}).`,
      usuarioNome: session.nome,
      usuarioSetor: session.setor,
      demandaSetorSolicitante: atualizada.setorSolicitante,
      demandaSetorResponsavel: atualizada.setorResponsavel,
      statusAnterior: demanda.status,
      statusNovo: atualizada.status,
    });
  } else {
    const camposAlterados = changedKeys.map((k) => CAMPO_LABEL[k] ?? k).join(", ");
    await registrarEvento({
      demandaId: atualizada.id,
      demandaTitulo: atualizada.titulo,
      tipo: "EDITADA",
      descricao: `Campos atualizados (${camposAlterados}) por ${session.nome} (${session.setor}).`,
      usuarioNome: session.nome,
      usuarioSetor: session.setor,
      demandaSetorSolicitante: atualizada.setorSolicitante,
      demandaSetorResponsavel: atualizada.setorResponsavel,
    });
  }

  // Demanda foi reatribuída para outro setor responsável — avisa quem passou a receber.
  if (resto.setorResponsavel && resto.setorResponsavel !== demanda.setorResponsavel) {
    await notificarSetor(resto.setorResponsavel, {
      mensagem: `${session.nome} (${SETOR_LABEL[session.setor]}) transferiu uma demanda para o seu setor: "${atualizada.titulo}".`,
      demandaId: atualizada.id,
      demandaTitulo: atualizada.titulo,
      excluirUserId: session.userId,
    });
  }

  // Demanda acabou de ser concluída (não estava concluída antes) — avisa o admin.
  if (data.status === "CONCLUIDA" && demanda.status !== "CONCLUIDA") {
    // Notificação dentro do app: escrita rápida no banco, então espera terminar antes de
    // responder — garante que o aviso já aparece pro admin mesmo sem WhatsApp configurado.
    // Não notifica quem já é o próprio autor da mudança (evita avisar a si mesmo).
    await notificarAdmins({
      mensagem: `${session.nome} (${SETOR_LABEL[session.setor]}) marcou a demanda "${atualizada.titulo}" como concluída.`,
      demandaId: atualizada.id,
      demandaTitulo: atualizada.titulo,
      excluirUserId: session.userId,
    });

    // WhatsApp (se configurado) roda depois da resposta ser enviada (after), pra não
    // deixar o usuário esperando um envio externo que pode demorar.
    after(async () => {
      const texto =
        `✅ Demanda concluída:\n"${atualizada.titulo}"\n` +
        `${SETOR_LABEL[atualizada.setorSolicitante]} → ${SETOR_LABEL[atualizada.setorResponsavel]}\n` +
        `Finalizada por ${session.nome} (${SETOR_LABEL[session.setor]}).`;
      const resultado = await enviarWhatsApp(texto);
      if (!resultado.enviado) {
        console.error(
          `[demandas] Falha ao notificar conclusão da demanda ${atualizada.id}: ${resultado.erro}`
        );
      }
    });
  }

  return NextResponse.json({ demanda: atualizada });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const demanda = await prisma.demanda.findUnique({ where: { id } });
  if (!demanda) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });

  await prisma.demanda.delete({ where: { id } });

  await registrarEvento({
    demandaId: demanda.id,
    demandaTitulo: demanda.titulo,
    tipo: "EXCLUIDA",
    descricao: `Demanda excluída por ${auth.session.nome} (${auth.session.setor}).`,
    usuarioNome: auth.session.nome,
    usuarioSetor: auth.session.setor,
    demandaSetorSolicitante: demanda.setorSolicitante,
    demandaSetorResponsavel: demanda.setorResponsavel,
  });

  return NextResponse.json({ ok: true });
}
