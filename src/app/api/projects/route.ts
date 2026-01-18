import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ProjectCreateSchema } from "@/lib/validators";
import { BETA_LIMITS, isBetaLimitsEnabled } from "@/lib/beta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN", "MANAGER", "WORKER"]);

  const url = new URL(req.url);
  const companyIdOverride = url.searchParams.get("companyId");
  const companyId =
    auth.role === "ADMIN" && companyIdOverride ? companyIdOverride : auth.companyId;

  const where: any = { companyId };

  // MANAGER: ne voir que ses projets
  if (auth.role === "MANAGER") {
    where.managerId = auth.userId;
  }

  // WORKER: ne voir que les projets assignés
  if (auth.role === "WORKER") {
    const memberships = await prisma.projectMember.findMany({
      where: { userId: auth.userId, project: { companyId } },
      select: { projectId: true },
    });
    const projectIds = memberships.map((m) => m.projectId);
    where.id = { in: projectIds.length ? projectIds : ["__none__"] };
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const auth = await requireRole(["ADMIN", "MANAGER"]);
  const body = await req.json();
  const parsed = ProjectCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const companyId = auth.companyId;
  const d = parsed.data;

  // Normalisation: l'UI envoie un chiffre en euros (d.revenue).
  // On stocke en centimes en base.
  const revenueCents = Math.round((d.revenue ?? 0) * 100);

  const plannedLaborMinutes = Math.round((d.plannedLaborHours ?? 0) * 60);
  const plannedMaterialsCents = Math.round((d.plannedMaterials ?? 0) * 100);
  const plannedSubcontractCents = Math.round((d.plannedSubcontract ?? 0) * 100);
  const plannedOtherCents = Math.round((d.plannedOther ?? 0) * 100);

  if (isBetaLimitsEnabled()) {
    const activeCount = await prisma.project.count({
      where: { companyId, status: "ACTIVE" },
    });
    if (activeCount >= BETA_LIMITS.maxActiveProjects) {
      return NextResponse.json({ error: "BETA_PROJECT_LIMIT" }, { status: 402 });
    }
  }

  const project = await prisma.project.create({
    data: {
      companyId,
      managerId: auth.role === "MANAGER" ? auth.userId : null,
      name: d.name,
      clientName: d.clientName || null,
      address: d.address || null,
      status: "ACTIVE",
      revenueCents,

      // Budget prévisionnel (optionnel)
      budget: {
        create: {
          plannedLaborMinutes,
          plannedMaterialsCents,
          plannedSubcontractCents,
          plannedOtherCents,
        },
      },
    },
  });

  // Notify manager when project created (minimal)
  try {
    await prisma.notification.create({
      data: {
        companyId,
        userId: auth.userId,
        type: "PROJECT_AT_RISK",
        title: "Nouveau projet créé",
        body: `Projet: ${project.name}`,
      },
    });
  } catch {}

  return NextResponse.json({ project });
}
