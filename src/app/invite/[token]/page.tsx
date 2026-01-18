"use client";

import { useState } from "react";
import { Card, H1, Label, Btn } from "@/app/_ui/ui";

function passwordStrength(pw: string) {
  const s = pw || "";
  const len = s.length;
  const hasLower = /[a-z]/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  const hasDigit = /\d/.test(s);
  const hasSymbol = /[^A-Za-z0-9]/.test(s);

  // Score 0..4 (simple, UX only)
  let score = 0;
  if (len >= 8) score++;
  if (len >= 12) score++;
  if (hasLower && hasUpper) score++;
  if (hasDigit) score++;
  if (hasSymbol) score++;
  if (score > 4) score = 4;

  const labels = ["Très faible", "Faible", "Moyen", "Bon", "Fort"];
  return { score, label: labels[score] };
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Decode JWT payload (sans vérification) uniquement pour l'UX (afficher champ entreprise)
  function decodeInviteRole(): "MANAGER" | "WORKER" | "ADMIN" | null {
    try {
      const part = token.split(".")[1];
      if (!part) return null;
      const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
      const r = String(json?.role || "");
      return r === "MANAGER" || r === "WORKER" || r === "ADMIN" ? (r as any) : null;
    } catch {
      return null;
    }
  }

  const inviteRole = decodeInviteRole();
  const pwStrength = passwordStrength(password);
  const pwMismatch = password.length > 0 && password2.length > 0 && password !== password2;
  const canSubmit = !loading && password.length >= 8 && !pwMismatch && (inviteRole !== "MANAGER" || companyName.trim().length > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pwMismatch) {
      setErr("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token,
          name: name || undefined,
          password,
          ...(inviteRole === "MANAGER" ? { companyName } : {}),
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "ERROR");
      }
      window.location.href = "/dashboard";
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <H1>Invitation</H1>
        <div className="mt-2 text-sm text-zinc-400">Crée ton compte pour rejoindre l'équipe.</div>

        <form onSubmit={submit} className="mt-6 grid gap-4">
          {inviteRole === "MANAGER" ? (
            <div>
              <Label>Entreprise</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nom de ton entreprise"
                required
              />
              <div className="mt-1 text-xs text-zinc-500">Obligatoire pour activer un compte MANAGER.</div>
            </div>
          ) : null}
          <div>
            <Label>Nom (optionnel)</Label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Prénom"
            />
          </div>

          <div>
            <Label>Mot de passe</Label>
            <div className="relative mt-1">
              <input
                type={showPw ? "text" : "password"}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 pr-24 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
              >
                {showPw ? "Masquer" : "Afficher"}
              </button>
            </div>

            <div className="mt-2">
              <div className="h-2 w-full rounded-full bg-zinc-900">
                <div
                  className="h-2 rounded-full bg-zinc-200 transition-all"
                  style={{ width: `${(pwStrength.score / 4) * 100}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Sécurité : <span className="text-zinc-300">{pwStrength.label}</span>
              </div>
            </div>
          </div>

          <div>
            <Label>Confirmer le mot de passe</Label>
            <div className="relative mt-1">
              <input
                type={showPw2 ? "text" : "password"}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 pr-24 text-sm"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="Répète le mot de passe"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPw2((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
              >
                {showPw2 ? "Masquer" : "Afficher"}
              </button>
            </div>
            {pwMismatch ? <div className="mt-1 text-xs text-red-300">Les mots de passe ne correspondent pas.</div> : null}
          </div>

          {err ? <div className="text-sm text-red-300">{err}</div> : null}

          <div className="flex items-center justify-end">
            <Btn type="submit" disabled={!canSubmit}>{loading ? "..." : "Rejoindre"}</Btn>
          </div>
        </form>
      </Card>
    </main>
  );
}
