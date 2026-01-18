import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setAuthCookie, signToken } from "@/lib/auth";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET missing");
  return s;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ✅ AMÉLIORATION: Logs de debug pour identifier le problème
    console.log("[ACCEPT_INVITE] Received:", { 
      hasToken: !!body.token, 
      hasPassword: !!body.password,
      passwordLength: body.password?.length,
      hasName: !!body.name,
      hasCompanyName: !!body.companyName
    });
    
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");
    const name = body.name ? String(body.name) : undefined;
    const companyName = body.companyName ? String(body.companyName).trim() : "";

    // ✅ AMÉLIORATION: Validation avec messages spécifiques
    if (!token) {
      console.error("[ACCEPT_INVITE] Missing token");
      return NextResponse.json({ 
        error: "TOKEN_REQUIRED",
        message: "Le lien d'invitation est invalide" 
      }, { status: 400 });
    }
    
    if (!password) {
      console.error("[ACCEPT_INVITE] Missing password");
      return NextResponse.json({ 
        error: "PASSWORD_REQUIRED",
        message: "Le mot de passe est requis" 
      }, { status: 400 });
    }
    
    if (password.length < 8) {
      console.error("[ACCEPT_INVITE] Password too short:", password.length);
      return NextResponse.json({ 
        error: "PASSWORD_TOO_SHORT",
        message: "Le mot de passe doit contenir au moins 8 caractères"
      }, { status: 400 });
    }

    // Vérification du token
    let payload: any;
    try {
      payload = jwt.verify(token, getSecret());
    } catch (err) {
      console.error("[ACCEPT_INVITE] Invalid token:", err);
      return NextResponse.json({ 
        error: "INVALID_INVITE",
        message: "Le lien d'invitation est expiré ou invalide" 
      }, { status: 400 });
    }

    if (payload?.type !== "INVITE" || !payload.email || !payload.companyId) {
      console.error("[ACCEPT_INVITE] Invalid payload:", payload);
      return NextResponse.json({ 
        error: "INVALID_INVITE",
        message: "Le lien d'invitation est invalide" 
      }, { status: 400 });
    }

    const email = String(payload.email).toLowerCase();
    let companyId = String(payload.companyId);
    const role = (payload.role ?? "WORKER") as "MANAGER" | "WORKER";
    const inviterUserId = payload.inviterUserId ? String(payload.inviterUserId) : null;

    // Si c'est un MANAGER: il doit créer sa propre company lors de l'activation.
    if (role === "MANAGER") {
      if (!companyName) {
        return NextResponse.json({ 
          error: "COMPANY_REQUIRED",
          message: "Le nom de l'entreprise est requis" 
        }, { status: 400 });
      }
      const company = await prisma.company.create({
        data: { name: companyName },
        select: { id: true },
      });
      companyId = company.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: { ...(name ? { name } : {}), ...(password ? { passwordHash } : {}) },
      create: { email, passwordHash, name },
    });

    // Pour un WORKER invité par un MANAGER : rattacher au manager inviteur
    let managerUserIdToSet: string | null = null;
    if (role === "WORKER" && inviterUserId) {
      // Vérifie que l'inviteur est bien ADMIN/MANAGER de cette company
      const inviterMembership = await prisma.companyMember.findFirst({
        where: {
          companyId,
          userId: inviterUserId,
          role: { in: ["ADMIN", "MANAGER"] },
        },
        select: { userId: true },
      });
      if (inviterMembership) {
        managerUserIdToSet = inviterMembership.userId;
      }
    }

    const membership = await prisma.companyMember.upsert({
      where: { companyId_userId: { companyId, userId: user.id } },
      update: {
        role,
        ...(managerUserIdToSet ? { managerUserId: managerUserIdToSet } : {}),
      },
      create: {
        companyId,
        userId: user.id,
        role,
        ...(managerUserIdToSet ? { managerUserId: managerUserIdToSet } : {}),
      },
    });

    console.log("[ACCEPT_INVITE] Success for:", email);
    
    const authToken = signToken({ userId: user.id, companyId, role: membership.role });
    await setAuthCookie(authToken);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ACCEPT_INVITE] Unexpected error:", error);
    return NextResponse.json({ 
      error: "INTERNAL_ERROR",
      message: "Une erreur inattendue s'est produite" 
    }, { status: 500 });
  }
}
