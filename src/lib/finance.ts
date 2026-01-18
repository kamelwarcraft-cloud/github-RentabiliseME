import { ExpenseCategory } from "@prisma/client";

export function computeProjectFinancials(args: {
  revenueCents: number;
  hourlyCostCents: number;
  overheadRateBps: number;
  planned?: {
    laborMinutes: number;
    materialsCents: number;
    subcontractCents: number;
    otherCents: number;
  };
  actual: {
    laborMinutes: number;
    expensesByCatCents: Partial<Record<ExpenseCategory, number>>;
  };
}) {
  const exp = args.actual.expensesByCatCents;
  const actualLaborCost = Math.round((args.actual.laborMinutes * args.hourlyCostCents) / 60);

  const materials = exp.MATERIAL ?? 0;
  const subcontract = exp.SUBCONTRACT ?? 0;
  const other = (exp.OTHER ?? 0) + (exp.TRAVEL ?? 0) + (exp.RENTAL ?? 0);

  const directCosts = actualLaborCost + materials + subcontract + other;
  const overhead = Math.round((directCosts * args.overheadRateBps) / 10000);
  const totalCosts = directCosts + overhead;

  const marginCents = args.revenueCents - totalCosts;
  const marginPct = args.revenueCents > 0 ? (marginCents / args.revenueCents) * 100 : 0;

  const status =
    marginPct >= 15 ? "RENTABLE" :
    marginPct >= 5 ? "A_RISQUE" : "NON_RENTABLE";

  const breakEvenRemainingMinutes =
    args.hourlyCostCents > 0 ? Math.floor((marginCents / args.hourlyCostCents) * 60) : 0;

  return {
    revenueCents: args.revenueCents,
    actual: { laborMinutes: args.actual.laborMinutes, laborCostCents: actualLaborCost, materialsCents: materials, subcontractCents: subcontract, otherCents: other, overheadCents: overhead, totalCostsCents: totalCosts },
    marginCents,
    marginPct,
    status,
    breakEvenRemainingMinutes,
    planned: args.planned ?? null,
  };
}
