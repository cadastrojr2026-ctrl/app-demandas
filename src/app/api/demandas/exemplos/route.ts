import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Remove todas as demandas de exemplo (dados de seed) em lote.
export async function DELETE() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { count } = await prisma.demanda.deleteMany({ where: { exemplo: true } });
  return NextResponse.json({ ok: true, count });
}
