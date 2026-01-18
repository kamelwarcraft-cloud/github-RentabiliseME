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
      const items = await prisma.invoice.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        include: { client: true, project: true },
        take: 50,
      });

      return NextResponse.json({ items });
    } catch (dbError) {
      console.warn("[API] Invoice table not ready:", dbError);
      return NextResponse.json({ items: [] });
    }
  } catch (error) {
    console.error("[API] GET /api/invoices error:", error);
    return NextResponse.json({ items: [] });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole(["ADMIN", "MANAGER"]);
    const body = await req.json().catch(() => ({}));
    const quoteId = body.quoteId ? String(body.quoteId) : null;

    let fromQuote: {
      projectId: string | null;
      clientId: string | null;
      lines: any;
      currency: string;
      subtotalCents: number;
      vatCents: number;
      totalCents: number;
    } | null = null;

    try {
      if (quoteId) {
        fromQuote = await prisma.quote.findFirst({
          where: { id: quoteId, companyId: auth.companyId },
          select: {
            projectId: true,
            clientId: true,
            lines: true,
            currency: true,
            subtotalCents: true,
            vatCents: true,
            totalCents: true,
          },
        });
        if (!fromQuote) {
          return NextResponse.json({ 
            error: "QUOTE_NOT_FOUND",
            message: "Devis introuvable" 
          }, { status: 404 });
        }
      }

      const projectId = fromQuote?.projectId ?? (body.projectId ? String(body.projectId) : null);
      const clientId = fromQuote?.clientId ?? (body.clientId ? String(body.clientId) : null);
      const lines = fromQuote?.lines ?? (Array.isArray(body.lines) ? body.lines : []);
      const currency = typeof (fromQuote?.currency ?? body.currency) === "string" ? (fromQuote?.currency ?? body.currency) : "EUR";

      // totals are computed server-side (simple)
      const subtotalCents = Math.max(0, Math.round(Number((fromQuote?.subtotalCents ?? body.subtotalCents) ?? 0)));
      const vatCents = Math.max(0, Math.round(Number((fromQuote?.vatCents ?? body.vatCents) ?? 0)));
      const totalCents = Math.max(0, Math.round(Number((fromQuote?.totalCents ?? body.totalCents) ?? (subtotalCents + vatCents))));

      const year = new Date().getFullYear();
      const prefix = "F";
      const count = await prisma.invoice.count({ 
        where: { 
          companyId: auth.companyId, 
          number: { startsWith: `${prefix}-${year}-` } 
        } 
      });
      const number = nextNumber(prefix, year, count + 1);

      const item = await prisma.invoice.create({
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
      console.error("[API] Error creating invoice:", dbError);
      return NextResponse.json({ 
        error: "CREATE_FAILED",
        message: "Erreur lors de la création de la facture" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[API] POST /api/invoices error:", error);
    return NextResponse.json({ 
      error: "INTERNAL_ERROR",
      message: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}
