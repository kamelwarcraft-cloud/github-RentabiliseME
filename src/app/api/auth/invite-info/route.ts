import { NextResponse } from "next/server";
import { verifyInviteToken } from "@/lib/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public endpoint: returns minimal info from invite token (role, email).
 * Used to render set-password UI conditionally (MANAGER => create company).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (!token) return NextResponse.json({ error: "BAD_TOKEN" }, { status: 400 });

  try {
    const p = verifyInviteToken(token);
    return NextResponse.json({ ok: true, email: p.email, role: p.role, companyId: p.companyId });
  } catch {
    return NextResponse.json({ error: "BAD_TOKEN" }, { status: 400 });
  }
}
