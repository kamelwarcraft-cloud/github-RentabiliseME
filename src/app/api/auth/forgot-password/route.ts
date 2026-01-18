import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { sendMail, publicBaseUrl } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET missing");
  return s;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: true });
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  // Réponse non-déterministe (ne pas leak si email existe)
  if (!user) return NextResponse.json({ ok: true });

  const token = jwt.sign({ type: "RESET", email }, getSecret(), { expiresIn: "1h" });
  const link = `${publicBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: email,
    subject: "🔐 Réinitialisation de mot de passe – Rentabilise.me",
    text:
      "Tu as demandé une réinitialisation de mot de passe.\n\n" +
      `Clique ici: ${link}\n\n` +
      "Si tu n'es pas à l'origine de cette demande, ignore ce message.",
  }).catch((e) => console.warn("[RESET] mail error", e));

  return NextResponse.json({ ok: true });
}
