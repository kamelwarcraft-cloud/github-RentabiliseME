import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN", "MANAGER"]);
  const body = await req.json().catch(() => ({}));

  const vatEnabled = !!body.vatEnabled;
  const vatRate = Number(body.vatRateBps ?? body.vatRate ?? 0);
  const urssafRate = Number(body.urssafRateBps ?? body.urssafRate ?? 0);
  const taxRegime = body.taxRegime === "REAL" ? "REAL" : "MICRO";

  const settings = await prisma.companySettings.upsert({
    where: { companyId: auth.companyId },
    create: {
      companyId: auth.companyId,
      taxRegime,
      vatEnabled,
      vatRateBps: Math.max(0, Math.round(vatRate)),
      urssafRateBps: Math.max(0, Math.round(urssafRate)),
    },
    update: {
      taxRegime,
      vatEnabled,
      vatRateBps: Math.max(0, Math.round(vatRate)),
      urssafRateBps: Math.max(0, Math.round(urssafRate)),
    },
    select: { taxRegime: true, vatEnabled: true, vatRateBps: true, urssafRateBps: true },
  });

  return NextResponse.json({ ok: true, settings });
}
