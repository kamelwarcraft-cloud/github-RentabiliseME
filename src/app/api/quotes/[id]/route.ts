import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN", "MANAGER"]);
  const { id } = await ctx.params;
  const item = await prisma.quote.findFirst({
    where: { id, companyId: auth.companyId },
  });
  if (!item) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN", "MANAGER"]);
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const item = await prisma.quote.updateMany({
    where: { id, companyId: auth.companyId },
    data: body,
  });
  return NextResponse.json({ ok: true, count: item.count });
}
