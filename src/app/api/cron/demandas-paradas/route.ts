import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { verificarDemandasParadas } from "@/lib/demandasParadas";

/**
 * Verifica demandas de alta prioridade paradas e dispara alertas de WhatsApp.
 *
 * Duas formas de chamar esta rota:
 *  - Automaticamente pelo agendador (Vercel Cron ou serviço externo como cron-job.org),
 *    autenticado pelo header `Authorization: Bearer <CRON_SECRET>`.
 *  - Manualmente pela tela de administração ("Testar agora"), autenticado pela sessão
 *    de um usuário ADMIN.
 */
async function autorizado(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;

  const auth = await requireAdmin();
  return !("error" in auth);
}

export async function GET(request: NextRequest) {
  if (!(await autorizado(request))) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const resultado = await verificarDemandasParadas();
  return NextResponse.json(resultado);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
