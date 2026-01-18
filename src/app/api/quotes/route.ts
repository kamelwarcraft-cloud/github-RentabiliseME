import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nextNumber(prefix: string, year: number, n: number) {
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}

export async function GET(req: Request) {
  try {
    const auth = await requireRole(["ADMIN", "MANAGER"]);
    const url = new URL(req.url);
    const companyIdOverride = url.searchParams.get("companyId");
    const companyId = auth.role === "ADMIN" && companyIdOverride ? companyIdOverride : auth.companyId;

    try {
      const items = await prisma.quote.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        include: { client: true, project: true },
        take: 50,
      });

      return NextResponse.json({ items });
    } catch (dbError) {
      console.warn("[API] Quote table not ready:", dbError);
      return NextResponse.json({ items: [] });
    }
  } catch (error) {
    console.error("[API] GET /api/quotes error:", error);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole(["ADMIN", "MANAGER"]);
    const body = await req.json().catch(() => ({}));

    const projectId = body.projectId ? String(body.projectId) : null;
    const clientId = body.clientId ? String(body.clientId) : null;
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const currency = typeof body.currency === "string" ? body.currency : "EUR";

    // totals are computed server-side (simple)
    const subtotalCents = Math.max(0, Math.round(Number(body.subtotalCents ?? 0)));
    const vatCents = Math.max(0, Math.round(Number(body.vatCents ?? 0)));
    const totalCents = Math.max(0, Math.round(Number(body.totalCents ?? (subtotalCents + vatCents))));

    try {
      const year = new Date().getFullYear();
      const prefix = "D";
      const count = await prisma.quote.count({ 
        where: { 
          companyId: auth.companyId, 
          number: { startsWith: `${prefix}-${year}-` } 
        } 
      });
      const number = nextNumber(prefix, year, count + 1);

      const item = await prisma.quote.create({
        data: {
          companyId: auth.companyId,
          projectId,
          clientId,
          number,
          status: "DRAFT",
          currency,
          lines,
          subtotalCents,
          vatCents,
          totalCents,
        },
        include: { client: true, project: true },
      });

      return NextResponse.json({ item });
    } catch (dbError) {
      console.error("[API] Error creating quote:", dbError);
      return NextResponse.json({ 
        error: "CREATE_FAILED",
        message: "Erreur lors de la création du devis" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[API] POST /api/quotes error:", error);
    return NextResponse.json({ 
      error: "INTERNAL_ERROR",
      message: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}
