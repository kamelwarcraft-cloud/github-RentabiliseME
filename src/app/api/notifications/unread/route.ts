import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    
    try {
      const count = await prisma.notification.count({
        where: { companyId: auth.companyId, userId: auth.userId, readAt: null },
      });
      return NextResponse.json({ count });
    } catch (dbError) {
      console.warn("[API] Notification table not ready:", dbError);
      return NextResponse.json({ count: 0 });
    }
  } catch (error) {
    console.error("[API] GET /api/notifications/unread error:", error);
    return NextResponse.json({ count: 0 });
  }
}
