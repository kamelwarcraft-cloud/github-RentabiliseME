import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN", "MANAGER"]);
  const url = new URL(req.url);
  const companyIdOverride = url.searchParams.get("companyId");
  const companyId =
    auth.role === "ADMIN" && companyIdOverride ? companyIdOverride : auth.companyId;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { hourlyCostCents: true, overheadRateBps: true, name: true },
  });

  const projects = await prisma.project.findMany({
    where: { companyId },
    select: { id: true, name: true, revenueCents: true },
    orderBy: { createdAt: "desc" },
  });
  const projectIds = projects.map((p) => p.id);

  const exp = await prisma.expense.groupBy({
    by: ["projectId"],
    where: { companyId, projectId: { in: projectIds } },
    _sum: { amountCents: true },
  });
  const expByProject = new Map(exp.map((e) => [e.projectId, e._sum.amountCents ?? 0]));

  const times = await prisma.timeEntry.groupBy({
    by: ["projectId"],
    where: { companyId, projectId: { in: projectIds } },
    _sum: { minutes: true },
  });
  const minutesByProject = new Map(times.map((t) => [t.projectId, t._sum.minutes ?? 0]));

  const hourlyCostCents = company?.hourlyCostCents ?? 0;
  const overheadBps = company?.overheadRateBps ?? 0;

  const rows = projects.map((p) => {
    const minutes = minutesByProject.get(p.id) ?? 0;
    const laborCostCents = Math.round((minutes / 60) * hourlyCostCents);
    const directCostsCents = (expByProject.get(p.id) ?? 0) + laborCostCents;
    const overheadCents = Math.round((directCostsCents * overheadBps) / 10000);
    const totalCostsCents = directCostsCents + overheadCents;
    const revenue = p.revenueCents ?? 0;
    const marginCents = revenue - totalCostsCents;
    const marginPct = revenue > 0 ? (marginCents / revenue) * 100 : 0;

    return { projectId: p.id, name: p.name, revenueCents: revenue, totalCostsCents, marginCents, marginPct, minutes };
  });

  const totals = rows.reduce(
    (a, r) => {
      a.revenueCents += r.revenueCents;
      a.totalCostsCents += r.totalCostsCents;
      a.marginCents += r.marginCents;
      a.minutes += r.minutes;
      return a;
    },
    { revenueCents: 0, totalCostsCents: 0, marginCents: 0, minutes: 0 }
  );

  return NextResponse.json({ company: { id: companyId, name: company?.name ?? "" }, totals, rows });
}
