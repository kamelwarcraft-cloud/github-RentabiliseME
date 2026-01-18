import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireRole(["ADMIN", "MANAGER"]);
    const url = new URL(req.url);
    const companyIdOverride = url.searchParams.get("companyId");
    const companyId = auth.role === "ADMIN" && companyIdOverride ? companyIdOverride : auth.companyId;

    try {
      const clients = await prisma.client.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ clients });
    } catch (dbError) {
      console.warn("[API] Client table not ready:", dbError);
      return NextResponse.json({ clients: [] });
    }
  } catch (error) {
    console.error("[API] GET /api/clients error:", error);
    return NextResponse.json({ clients: [] });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireRole(["ADMIN", "MANAGER"]);
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const email = body.email ? String(body.email).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;
    const address = body.address ? String(body.address).trim() : null;

    if (!name) {
      return NextResponse.json({ 
        error: "NAME_REQUIRED",
        message: "Le nom du client est requis" 
      }, { status: 400 });
    }

    try {
      const client = await prisma.client.create({
        data: { companyId: auth.companyId, name, email, phone, address },
      });
      return NextResponse.json({ client });
    } catch (dbError) {
      console.error("[API] Error creating client:", dbError);
      return NextResponse.json({ 
        error: "CREATE_FAILED",
        message: "Erreur lors de la création du client" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[API] POST /api/clients error:", error);
    return NextResponse.json({ 
      error: "INTERNAL_ERROR",
      message: "Erreur interne du serveur" 
    }, { status: 500 });
  }
}
