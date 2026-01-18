import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { BETA_LIMITS, isBetaLimitsEnabled } from "@/lib/beta";
import { publicBaseUrl, sendInviteEmail } from "@/lib/mailer";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const INVITE_TTL_SECONDS = 7 * 24 * 60 * 60;

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET missing");
  return s;
}

export async function POST(req: Request) {
  // ADMIN peut inviter MANAGER/WORKER.
  // MANAGER peut inviter uniquement des WORKERS (rattachés à sa company).
  const auth = await requireRole(["ADMIN", "MANAGER"]);

  // Anti-abuse: invite rate limits
  // - 5 invites/hour per user
  // - 20 invites/day per company
  const ip = clientIp(req);
  const rlUser = rateLimit(`invite:u:${auth.userId}:${ip}`, 5, 60 * 60 * 1000);
  if (!rlUser.ok) {
    return NextResponse.json(
      { error: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rlUser.retryAfterMs || 0) / 1000)) } }
    );
  }
  const rlCompany = rateLimit(`invite:c:${auth.companyId}`, 20, 24 * 60 * 60 * 1000);
  if (!rlCompany.ok) {
    return NextResponse.json(
      { error: "RATE_LIMIT" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rlCompany.retryAfterMs || 0) / 1000)) } }
    );
  }
  const body = await req.json().catch(() => ({}));
  // tolérant: certains écrans peuvent envoyer inviteEmail au lieu de email
  const rawEmail = (body.email ?? body.inviteEmail ?? "") as string;
  const email = String(rawEmail).trim().toLowerCase();
  let role = (body.role ?? "WORKER") as "MANAGER" | "WORKER";

  // Si c'est un MANAGER, on force WORKER (invitations depuis Profil)
  if (auth.role === "MANAGER") role = "WORKER";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "BAD_EMAIL" }, { status: 400 });
  }

  if (isBetaLimitsEnabled()) {
    const members = await prisma.companyMember.count({ where: { companyId: auth.companyId } });
    if (members >= BETA_LIMITS.maxMembers) {
      return NextResponse.json({ error: "BETA_MEMBER_LIMIT" }, { status: 402 });
    }
  }

  const token = jwt.sign(
    {
      email,
      companyId: auth.companyId,
      role,
      type: "INVITE",
      inviterUserId: auth.userId,
    },
    getSecret(),
    { expiresIn: INVITE_TTL_SECONDS }
  );

  const base = publicBaseUrl(req);
  const inviteUrl = `${base}/invite/${token}`;

  // Envoi email (si SMTP configuré). Sinon fallback: lien à copier.
  let emailSent = false;
  let emailError: string | null = null;
  try {
    // ✅ CORRECTION: Récupérer l'email de l'inviteur depuis la BDD
    const [company, inviter] = await Promise.all([
      prisma.company.findUnique({ 
        where: { id: auth.companyId }, 
        select: { name: true } 
      }),
      prisma.user.findUnique({ 
        where: { id: auth.userId }, 
        select: { email: true } 
      })
    ]);
    
    await sendInviteEmail({
      to: email,
      inviteUrl,
      invitedBy: inviter?.email ?? undefined, // ✅ Utilise inviter.email au lieu de auth.email
      companyName: company?.name ?? undefined,
      role,
    });
    emailSent = true;
  } catch (e: any) {
    emailError = e?.message ? String(e.message) : "SMTP_FAILED";
    console.error("INVITE_MAIL_FAILED:", e);
  }

  return NextResponse.json({ token, inviteUrl, emailSent, emailError });
}
