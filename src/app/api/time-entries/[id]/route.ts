import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN", "MANAGER"]);
  const { id } = await ctx.params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const existing = await prisma.timeEntry.findFirst({
    where: { id, companyId: auth.companyId },
    select: { id: true, projectId: true },
  });

  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const updateData: any = {};
  
  if (body.date !== undefined) updateData.date = new Date(body.date);
  if (body.minutes !== undefined) updateData.minutes = Number(body.minutes);
  if (body.task !== undefined) updateData.task = body.task;
  if (body.note !== undefined) updateData.note = body.note;

  const updated = await prisma.timeEntry.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ entry: updated });
}