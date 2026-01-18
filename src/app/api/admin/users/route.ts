import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);

  // Un ADMIN (plateforme) peut auditer toutes les entreprises.
  // (On garde la compatibilité: si un jour on veut restreindre, on pourra filtrer ici.)
  const where: any = {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          companyId: true,
          managerUserId: true,
          company: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json({ users });
}