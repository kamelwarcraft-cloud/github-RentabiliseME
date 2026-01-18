import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint used by the landing page
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const source = typeof body?.source === "string" ? body.source.trim().slice(0, 120) : null;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "BAD_EMAIL" }, { status: 400 });
  }

  // idempotent
  await prisma.waitlistEntry.upsert({
    where: { email },
    update: { source: source ?? undefined },
    create: { email, source },
  });

  // Email de confirmation (si SMTP configuré)
  await sendMail({
    to: email,
    subject: "✅ Inscription à la bêta Rentabilise.me",
    text:
      "Merci ! Ton inscription à la bêta est confirmée.\n\n" +
      "On te recontacte par email dans les prochaines 24h.\n\n" +
      "À très vite,\nRentabilise.me",
  }).catch((e) => console.warn("[WAITLIST] mail error", e));

  return NextResponse.json({ ok: true });
}
