import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { buildHistoricoWhere } from "@/lib/historicoFiltro";

// Histórico de eventos das demandas.
// - Sem filtro: lista geral, com filtro opcional por período (`?desde=` / `?ate=`, AAAA-MM-DD),
//   por setor de quem fez (`?setor=`) e por situação resultante de mudanças de status
//   (`?statusNovo=CONCLUIDA&statusNovo=ENTREGUE`, repetido pra combinar mais de uma).
//   Estoque (admin) vê tudo; Almoxarifado e Fundição veem só o histórico de demandas do
//   próprio setor (mesma regra usada para listar as demandas). Paginado por cursor
//   (`?cursor=<id>`), 100 por página — sem isso, o histórico crescendo sumia com os eventos
//   mais antigos em silêncio (cortava em 300 sem avisar).
// - Com `?demandaId=`: histórico de uma demanda específica, disponível para qualquer usuário
//   autenticado (todos já podem ver todas as demandas, então também podem ver o histórico delas).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const demandaIdParam = searchParams.get("demandaId");
  const demandaId = demandaIdParam ? Number(demandaIdParam) : null;

  if (demandaId && Number.isInteger(demandaId) && demandaId > 0) {
    const auth = await requireUser();
    if ("error" in auth) return auth.error;

    const eventos = await prisma.historicoEvento.findMany({
      where: { demandaId },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ eventos });
  }

  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const where = buildHistoricoWhere(searchParams, auth.session);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 100, 1), 200);
  const cursorParam = searchParams.get("cursor");
  const cursorId = cursorParam && /^\d+$/.test(cursorParam) ? Number(cursorParam) : undefined;

  // Ordena por id (não createdAt) pra paginar por cursor com segurança — os ids são criados
  // em ordem cronológica nesta tabela (nunca é editada depois), então dá no mesmo resultado.
  const eventos = await prisma.historicoEvento.findMany({
    where,
    orderBy: [{ id: "desc" }],
    take: limit + 1,
    ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
  });

  const temMais = eventos.length > limit;
  const pagina = temMais ? eventos.slice(0, limit) : eventos;
  const proximoCursor = temMais ? pagina[pagina.length - 1].id : null;

  return NextResponse.json({ eventos: pagina, proximoCursor });
}
