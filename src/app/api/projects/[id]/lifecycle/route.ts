import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Lifecycle = "ACTIVE" | "DONE";

function jsonError(status: number, code: string, details?: any) {
  return NextResponse.json({ error: code, ...(details ? { details } : {}) }, { status });
}

function normalizeLifecycle(v: any): Lifecycle | null {
  if (!v) return null;
  if (typeof v !== "string") return null;

  const s = v.trim().toUpperCase();

  // tolérance (au cas où tu as envoyé "TERMINÉ" etc)
  if (s === "ACTIVE" || s === "EN_COURS" || s === "IN_PROGRESS") return "ACTIVE";
  if (s === "DONE" || s === "TERMINE" || s === "TERMINÉ" || s === "COMPLETED") return "DONE";

  return null;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN", "MANAGER"]);
  const { id } = await ctx.params;

  // 1) On récupère le projet + son lifecycle actuel
  const project = await prisma.project.findFirst({
    where: { id, companyId: auth.companyId },
    select: { id: true, lifecycle: true },
  });

  if (!project) return jsonError(404, "NOT_FOUND");

  // 2) Body optionnel
  let body: any = null;
  try {
    // PATCH peut arriver sans body -> ça throw, donc try/catch
    body = await req.json();
  } catch {
    body = null;
  }

  // 3) Si pas de body => toggle
  let next: Lifecycle | null = null;

  if (!body) {
    next = project.lifecycle === "DONE" ? "ACTIVE" : "DONE";
  } else {
    // accepte lifecycle OU status OU value (tolérance)
    next =
      normalizeLifecycle(body.lifecycle) ||
      normalizeLifecycle(body.value) ||
      normalizeLifecycle(body.status);
  }

  if (!next) {
    return jsonError(400, "BAD_REQUEST", {
      expected: ["ACTIVE", "DONE"],
      got: body ?? null,
    });
  }

  const updated = await prisma.project.update({
    where: { id: project.id },
    data: { lifecycle: next },
    select: { id: true, lifecycle: true },
  });

  return NextResponse.json({ ok: true, lifecycle: updated.lifecycle }, { status: 200 });
}
