import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN", "MANAGER"]);
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const existing = await prisma.project.findFirst({
    where: {
      id,
      companyId: auth.companyId,
      ...(auth.role === "MANAGER" ? { managerId: auth.userId } : {}),
    },
    select: { id: true, name: true, revenueCents: true },
  });

  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const updateData: any = {};
  
  if (body.revenueCents !== undefined) {
    updateData.revenueCents = Math.round(Number(body.revenueCents));
  }
  
  if (body.name !== undefined) {
    updateData.name = body.name;
  }

  if (body.clientName !== undefined) {
    updateData.clientName = body.clientName;
  }

  const updated = await prisma.project.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      clientName: true,
      revenueCents: true,
    },
  });

  return NextResponse.json({ project: updated });
}