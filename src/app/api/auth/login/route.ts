import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { LoginSchema } from "@/lib/validators";
import { signToken, setAuthCookie } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });

  // Un utilisateur peut appartenir à plusieurs companies (ex: comptes de test).
  // On choisit en priorité un rôle "fort" (ADMIN/MANAGER), sinon le plus récent.
  const memberships = await prisma.companyMember.findMany({
    where: { userId: user.id },
    select: { companyId: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  if (!memberships.length) return NextResponse.json({ error: "NO_COMPANY" }, { status: 403 });

  const roleRank = (r: string) => (r === "ADMIN" ? 3 : r === "MANAGER" ? 2 : 1);
  const membership = [...memberships].sort((a, b) => {
    const dr = roleRank(b.role) - roleRank(a.role);
    if (dr !== 0) return dr;
    return b.createdAt.getTime() - a.createdAt.getTime();
  })[0];

  const token = signToken({
    userId: user.id,
    companyId: membership.companyId,
    role: membership.role,
  });

  await setAuthCookie(token);

  return NextResponse.json({ ok: true });
}
