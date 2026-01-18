import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { signInviteToken } from "@/lib/invite";
import { prisma } from "@/lib/db";
import { sendInviteEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originFromReq(req: Request) {
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  const body = await req.json().catch(() => null);

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body?.role === "string" ? body.role : "WORKER";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "BAD_EMAIL" }, { status: 400 });
  }
  if (!["WORKER", "MANAGER"].includes(role)) {
    // Admin panel ne doit pas inviter ADMIN
    return NextResponse.json({ error: "BAD_ROLE" }, { status: 400 });
  }

  const token = signInviteToken({
    email,
    companyId: auth.companyId,
    role: role as "WORKER" | "MANAGER",
  });

  const publicBase = process.env.PUBLIC_BASE_URL || originFromReq(req);
  const link = `${publicBase}/set-password?token=${encodeURIComponent(token)}`;

  // (Optionnel) Récupère le nom de la company pour personnaliser l’email
  const company = await prisma.company.findUnique({
    where: { id: auth.companyId },
    select: { name: true },
  });

  let emailSent = false;
  let emailError: string | null = null;

  try {
    await sendInviteEmail({
      to: email,
      inviteUrl: link,
      invitedBy: "Rentabilise.me",
      companyName: company?.name ?? undefined,
      role: role as "WORKER" | "MANAGER",
    });
    emailSent = true;
  } catch (e: any) {
    emailError = e?.message ? String(e.message) : "SMTP_FAILED";
    console.error("INVITE_MAIL_FAILED:", e);
  }

  return NextResponse.json({ ok: true, link, token, emailSent, emailError });
}
