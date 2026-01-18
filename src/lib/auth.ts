import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";

export type AuthPayload = {
  userId: string;
  companyId: string;
  role: Role;
};

const COOKIE_NAME = "cp_token";

function getSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET missing");
  }
  return process.env.JWT_SECRET;
}

export function signToken(payload: AuthPayload) {
  return jwt.sign(payload, getSecret(), { expiresIn: "7d" });
}


export async function getAuth(): Promise<AuthPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, getSecret()) as AuthPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
