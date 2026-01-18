import { NextResponse } from "next/server";
import { isBetaModeEnabled, isBetaLimitsEnabled, BETA_LIMITS } from "@/lib/beta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    betaMode: isBetaModeEnabled(),
    betaLimits: isBetaLimitsEnabled(),
    limits: BETA_LIMITS,
    pricing: { monthlyEur: 14.99 },
  });
}
