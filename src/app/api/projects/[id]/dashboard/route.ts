import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { computeProjectFinancials } from "@/lib/finance";
import { ExpenseCategory } from "@prisma/client";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN", "MANAGER", "WORKER"]);
  const { id } = await ctx.params;

  const project = await prisma.project.findFirst({
    where: { id, companyId: auth.companyId },
    include: { budget: true },
  });
  if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const company = await prisma.company.findUnique({
    where: { id: auth.companyId },
    select: { hourlyCostCents: true, overheadRateBps: true },
  });
  if (!company) return NextResponse.json({ error: "NO_COMPANY" }, { status: 403 });

  const [timeAgg, expAgg] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: { companyId: auth.companyId, projectId: project.id },
      _sum: { minutes: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { companyId: auth.companyId, projectId: project.id },
      _sum: { amountCents: true },
    }),
  ]);

  const expensesByCat: Partial<Record<ExpenseCategory, number>> = {};
  for (const row of expAgg) {
    expensesByCat[row.category] = row._sum.amountCents ?? 0;
  }

  const financials = computeProjectFinancials({
    revenueCents: project.revenueCents,
    hourlyCostCents: company.hourlyCostCents,
    overheadRateBps: company.overheadRateBps,
    planned: project.budget
      ? {
          laborMinutes: project.budget.plannedLaborMinutes,
          materialsCents: project.budget.plannedMaterialsCents,
          subcontractCents: project.budget.plannedSubcontractCents,
          otherCents: project.budget.plannedOtherCents,
        }
      : undefined,
    actual: {
      laborMinutes: timeAgg._sum.minutes ?? 0,
      expensesByCatCents: expensesByCat,
    },
  });

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
      lifecycle: project.lifecycle,
    },
    financials,
  });
}
