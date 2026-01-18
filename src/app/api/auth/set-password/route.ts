import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { verifyInviteToken } from "@/lib/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanCompanyName(v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  // keep it simple for beta
  if (!s) return "";
  return s.slice(0, 80);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const companyName = cleanCompanyName(body?.companyName);

  if (!token || password.length < 8) {
    return NextResponse.json({ error: "BAD_INPUT" }, { status: 400 });
  }

  let payload: { email: string; companyId: string; role: "ADMIN" | "MANAGER" | "WORKER" };
  try {
    const p = verifyInviteToken(token);
    payload = { email: p.email, companyId: p.companyId, role: p.role };
  } catch {
    return NextResponse.json({ error: "BAD_TOKEN" }, { status: 400 });
  }

  // We do not allow creating ADMIN accounts through invite links in beta.
  if (payload.role === "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Create or update user
  const user = await prisma.user.upsert({
    where: { email: payload.email },
    update: { passwordHash },
    create: { email: payload.email, passwordHash },
  });

  // Company resolution:
  // - WORKER: must join the inviter's company (payload.companyId)
  // - MANAGER: can create their own company during set-password (if provided)
  let companyId = payload.companyId;

  if (payload.role === "MANAGER") {
    if (!companyName) {
      return NextResponse.json({ error: "COMPANY_REQUIRED" }, { status: 400 });
    }

    const company = await prisma.company.create({
      data: { name: companyName },
      select: { id: true },
    });

    companyId = company.id;
  }

  // Ensure membership
  await prisma.companyMember.upsert({
    where: { companyId_userId: { companyId, userId: user.id } },
    update: { role: payload.role },
    create: { companyId, userId: user.id, role: payload.role },
  });

  const jwt = signToken({ userId: user.id, companyId, role: payload.role });

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "rp_auth",
    value: jwt,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return res;
}
