import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export async function GET(req: Request) {
  const auth = await requireRole(["ADMIN"]);

  const items = await prisma.waitlistEntry.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      source: true,
      status: true,
      note: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ items });
}

export async function PATCH(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  const body = await req.json();

  if (!body.id || !body.status) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  const updated = await prisma.waitlistEntry.update({
    where: { id: body.id },
    data: { status: body.status },
  });

  return NextResponse.json({ updated });
}

export async function DELETE(req: Request) {
  const auth = await requireRole(["ADMIN"]);
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  await prisma.waitlistEntry.delete({
    where: { id: body.id },
  });

  return NextResponse.json({ ok: true });
}
