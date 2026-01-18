import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireRole(["ADMIN", "MANAGER"]);
    
    try {
      const company = await prisma.company.findUnique({
        where: { id: auth.companyId },
        select: { id: true, name: true },
      });

      const members = await prisma.companyMember.findMany({
        where: { companyId: auth.companyId },
        select: {
          id: true,
          role: true,
          managerUserId: true,
          user: { select: { id: true, email: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const projects = await prisma.project.findMany({
        where: { companyId: auth.companyId },
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
      });

      const projectMembers = await prisma.projectMember.findMany({
        where: { project: { companyId: auth.companyId } },
        select: { projectId: true, userId: true },
      });

      const settings = await prisma.companySettings.findUnique({
        where: { companyId: auth.companyId },
        select: { taxRegime: true, vatEnabled: true, vatRateBps: true, urssafRateBps: true },
      });

      return NextResponse.json({ company, members, projects, projectMembers, settings });
    } catch (dbError) {
      console.error("[API] Database error in /api/company:", dbError);
      // Retourner des données vides plutôt qu'une erreur
      return NextResponse.json({ 
        company: null, 
        members: [], 
        projects: [], 
        projectMembers: [], 
        settings: null 
      });
    }
  } catch (error) {
    console.error("[API] GET /api/company error:", error);
    return NextResponse.json({ 
      error: "INTERNAL_ERROR",
      message: "Erreur lors de la récupération des données" 
    }, { status: 500 });
  }
}
