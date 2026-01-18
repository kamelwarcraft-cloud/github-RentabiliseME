import jwt from "jsonwebtoken";

type InvitePayload = {
  purpose: "set_password";
  email: string;
  companyId: string;
  role: "ADMIN" | "MANAGER" | "WORKER";
};

function inviteSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET missing");
  return s;
}

export function signInviteToken(opts: {
  email: string;
  companyId: string;
  role: "ADMIN" | "MANAGER" | "WORKER";
}) {
  const payload: InvitePayload = {
    purpose: "set_password",
    email: opts.email,
    companyId: opts.companyId,
    role: opts.role,
  };
  // 7 jours: assez pour une bêta sans laisser traîner indéfiniment
  return jwt.sign(payload, inviteSecret(), { expiresIn: "7d" });
}

export function verifyInviteToken(token: string) {
  const decoded = jwt.verify(token, inviteSecret()) as any;
  if (decoded?.purpose !== "set_password") {
    throw new Error("BAD_PURPOSE");
  }
  return decoded as InvitePayload;
}
