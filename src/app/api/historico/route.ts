import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Histórico de eventos das demandas — apenas o administrador (Estoque) tem acesso.
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const eventos = await prisma.historicoEvento.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });

  return NextResponse.json({ eventos });
}
