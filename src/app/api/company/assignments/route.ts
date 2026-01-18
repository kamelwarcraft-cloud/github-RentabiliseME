import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN", "MANAGER"]);
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId ?? "");
  const projectIds: string[] = Array.isArray(body.projectIds) ? body.projectIds : [];

  if (!userId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  // Ensure user is a member of this company
  const member = await prisma.companyMember.findFirst({
    where: { companyId: auth.companyId, userId },
    select: { id: true, role: true },
  });
  if (!member || member.role !== "WORKER") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // Ensure projects belong to company
  const okProjects = await prisma.project.findMany({
    where: { companyId: auth.companyId, id: { in: projectIds } },
    select: { id: true, name: true },
  });
  const okIds = new Set(okProjects.map((p) => p.id));

  await prisma.projectMember.deleteMany({
    where: { userId, project: { companyId: auth.companyId } },
  });

  if (okIds.size) {
    await prisma.projectMember.createMany({
      data: [...okIds].map((pid) => ({ userId, projectId: pid })),
      skipDuplicates: true,
    });
  }

  // notify worker
  try {
    await prisma.notification.create({
      data: {
        companyId: auth.companyId,
        userId,
        type: "ASSIGNED_TO_PROJECT",
        title: "Nouveaux projets assignés",
        body: okProjects.length ? okProjects.map((p) => p.name).join(", ") : "Aucun projet",
      },
    });
  } catch {}

  return NextResponse.json({ ok: true });
}
