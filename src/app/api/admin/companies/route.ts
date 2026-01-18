import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireRole(["ADMIN"]);
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ companies });
}
