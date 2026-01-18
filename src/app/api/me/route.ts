import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireAuth();

  const company = await prisma.company.findUnique({
    where: { id: auth.companyId },
    select: { id: true, name: true, hourlyCostCents: true, overheadRateBps: true },
  });

  return NextResponse.json({ auth, company });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const hourlyCost = Number(body.hourlyCost);
  const overheadRate = Number(body.overheadRate);

  if (!Number.isFinite(hourlyCost) || hourlyCost <= 0) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }
  if (!Number.isFinite(overheadRate) || overheadRate < 0 || overheadRate > 100) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const company = await prisma.company.update({
    where: { id: auth.companyId },
    data: {
      hourlyCostCents: Math.round(hourlyCost * 100),
      overheadRateBps: Math.round(overheadRate * 100),
    },
    select: { id: true, name: true, hourlyCostCents: true, overheadRateBps: true },
  });

  return NextResponse.json({ ok: true, company });
}
