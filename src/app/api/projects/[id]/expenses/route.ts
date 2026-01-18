import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN", "MANAGER", "WORKER"]);
  const { id: projectId } = await ctx.params;

  // Vérifier que le projet appartient à la même company
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId: auth.companyId },
    select: { id: true },
  });

  if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  // Récupérer toutes les dépenses avec les infos utilisateur
  const expenses = await prisma.expense.findMany({
    where: {
      projectId,
      companyId: auth.companyId,
    },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      category: true,
      amountCents: true,
      vendor: true,
      note: true,
      createdAt: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Pour les WORKER, ne montrer que leurs propres dépenses
  const filteredExpenses = auth.role === "WORKER" 
    ? expenses.filter(e => e.userId === auth.userId)
    : expenses;

  return NextResponse.json({ expenses: filteredExpenses });
}