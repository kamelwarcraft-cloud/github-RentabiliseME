import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth();
  const items = await prisma.notification.findMany({
    where: { companyId: auth.companyId, userId: auth.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = items.filter((n) => !n.readAt).length;
  return NextResponse.json({ items, unread });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length) return NextResponse.json({ ok: true });

  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId: auth.userId, companyId: auth.companyId },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
