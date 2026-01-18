import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET missing");
  return s;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (!token || password.length < 8) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  let payload: any;
  try {
    payload = jwt.verify(token, getSecret());
  } catch {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });
  }

  if (payload?.type !== "RESET" || !payload?.email) {
    return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });
  }

  const email = String(payload.email).toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ ok: true });

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}
