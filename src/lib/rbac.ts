import type { Role } from "@prisma/client";
import { headers, cookies } from "next/headers";
import { getAuth } from "./auth";

async function getPathSafe() {
  try {
    const h = await headers();
    return (
      h.get("x-invoke-path") ||
      h.get("x-matched-path") ||
      h.get("referer") ||
      "(unknown)"
    );
  } catch {
    return "(unknown)";
  }
}

async function hasAuthCookie() {
  try {
    const c = await cookies();
    // ⚠️ Mets ici le VRAI nom de ton cookie si différent
    return Boolean(c.get("cp_token")?.value || c.get("token")?.value);
  } catch {
    return false;
  }
}

export async function requireAuth() {
  const auth = await getAuth();
  if (!auth) {
    console.warn("[AUTH] UNAUTHORIZED", {
      path: await getPathSafe(),
      hasCookie: await hasAuthCookie(),
    });
    throw new Error("UNAUTHORIZED");
  }
  return auth;
}

export async function requireRole(roles: Role | Role[]) {
  const auth = await requireAuth();
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!allowed.includes(auth.role)) {
    console.warn("[AUTH] FORBIDDEN", {
      path: await getPathSafe(),
      role: auth.role,
      allowed,
    });
    throw new Error("FORBIDDEN");
  }

  return auth;
}
