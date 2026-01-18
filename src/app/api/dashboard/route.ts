import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function profitStatus(marginPct: number) {
  if (marginPct >= 20) return "RENTABLE";
  if (marginPct >= 0) return "A_RISQUE";
  return "NON_RENTABLE";
}

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN", "MANAGER", "WORKER"]);
  const url = new URL(req.url);
  const companyIdOverride = url.searchParams.get("companyId");
  const companyId =
    auth.role === "ADMIN" && companyIdOverride ? companyIdOverride : auth.companyId;

  const where: any = { companyId };
  if (auth.role === "MANAGER") where.managerId = auth.userId;

  if (auth.role === "WORKER") {
    const mem = await prisma.projectMember.findMany({
      where: { userId: auth.userId, project: { companyId } },
      select: { projectId: true },
    });
    where.id = { in: mem.length ? mem.map((m) => m.projectId) : ["__none__"] };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { hourlyCostCents: true, overheadRateBps: true },
  });

  const hourlyCostCents = company?.hourlyCostCents ?? 0;
  const overheadRate = (company?.overheadRateBps ?? 0) / 10000;

  const projects = await prisma.project.findMany({
    where,
    include: {
      timeEntries: { select: { minutes: true } },
      expenses: { select: { amountCents: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = projects.map((p) => {
    const revenueCents = p.revenueCents ?? 0;
    const laborMinutes = p.timeEntries.reduce((a, t) => a + (t.minutes ?? 0), 0);
    const laborCostCents = Math.round((laborMinutes / 60) * hourlyCostCents);

    const expenseCents = p.expenses.reduce((a, e) => a + (e.amountCents ?? 0), 0);
    const directCostsCents = laborCostCents + expenseCents;
    const overheadCents = Math.round(directCostsCents * overheadRate);
    const totalCostsCents = directCostsCents + overheadCents;

    const marginCents = revenueCents - totalCostsCents;
    const marginPct = revenueCents > 0 ? (marginCents / revenueCents) * 100 : 0;

    return {
      id: p.id,
      name: p.name,
      clientName: p.clientName,
      revenueCents,
      laborMinutes,
      totalCostsCents,
      marginCents,
      marginPct,
      lifecycle: p.status === "ACTIVE" ? "ACTIVE" : p.status === "ARCHIVED" ? "ARCHIVED" : "DONE",
      status: profitStatus(marginPct),
    };
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  // KPIs month: based on project updated in month (simple)
  let caMonthCents = 0;
  let marginMonthCents = 0;
  let atRiskCount = 0;
  for (const r of rows) {
    caMonthCents += r.revenueCents;
    marginMonthCents += r.marginCents;
    if (r.status !== "RENTABLE") atRiskCount++;
  }

  return NextResponse.json({ projects: rows, kpis: { caMonthCents, marginMonthCents, atRiskCount } });
}
