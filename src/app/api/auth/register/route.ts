import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { RegisterSchema } from "@/lib/validators";
import { signToken, setAuthCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`register:${ip}`, 5, 30 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password, companyName, hourlyCost } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, passwordHash } });

    const company = await tx.company.create({
      data: { name: companyName, hourlyCostCents: Math.round(hourlyCost * 100) },
    });

    const member = await tx.companyMember.create({
      data: { userId: user.id, companyId: company.id, role: "ADMIN" },
    });

    return { user, company, member };
  });

  const token = signToken({
    userId: result.user.id,
    companyId: result.company.id,
    role: result.member.role,
  });

  await setAuthCookie(token);

  return NextResponse.json({ ok: true, companyId: result.company.id });
}
