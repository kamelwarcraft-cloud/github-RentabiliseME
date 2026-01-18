import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { TimeEntryCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN", "MANAGER", "WORKER"]);
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50);

  // Construction du filtre selon le rôle
  const whereClause: any = {
    companyId: auth.companyId,
    ...(projectId ? { projectId } : {}),
  };

  // WORKER : ne voir que ses propres entrées. (Les projets visibles sont ceux de la company)
  if (auth.role === "WORKER") {
    whereClause.userId = auth.userId;
  }

  const entries = await prisma.timeEntry.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      projectId: true,
      date: true,
      minutes: true,
      task: true,
      note: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN", "MANAGER", "WORKER"]);

  const body = await req.json();
  const parsed = TimeEntryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  // Vérifier que le projet existe et appartient à la company
  const project = await prisma.project.findFirst({
    where: { id: d.projectId, companyId: auth.companyId },
    select: { id: true, managerId: true },
  });
  
  if (!project) return NextResponse.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });

  // WORKER : peut saisir sur les projets de sa company (pas de restriction par manager)

  const entry = await prisma.timeEntry.create({
    data: {
      companyId: auth.companyId,
      projectId: d.projectId,
      userId: auth.userId,
      date: new Date(d.date),
      minutes: d.minutes,
      task: d.task,
      note: d.note,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["ADMIN", "MANAGER", "WORKER"]);
  const body = await req.json().catch(() => null);
  const id = body?.id as string | undefined;
  if (!id) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

  const existing = await prisma.timeEntry.findFirst({
    where: { id, companyId: auth.companyId },
    select: { id: true, userId: true },
  });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // ❌ WORKER ne peut JAMAIS supprimer (même ses propres entrées)
  if (auth.role === "WORKER") {
    return NextResponse.json({ error: "FORBIDDEN_WORKER_CANNOT_DELETE" }, { status: 403 });
  }

  // MANAGER/ADMIN peuvent supprimer n'importe quelle entrée
  await prisma.timeEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
