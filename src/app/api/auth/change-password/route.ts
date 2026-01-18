import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const current = String(body.currentPassword ?? "");
  const next = String(body.newPassword ?? "");
  if (next.length < 8 || current.length < 1) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { passwordHash: true } });
  if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "INVALID_CURRENT_PASSWORD" }, { status: 401 });

  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: auth.userId }, data: { passwordHash } });

  return NextResponse.json({ ok: true });
}
