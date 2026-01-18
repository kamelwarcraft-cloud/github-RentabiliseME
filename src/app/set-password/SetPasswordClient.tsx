"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Btn, Card, H1, Label } from "@/app/_ui/ui";

type InviteInfo = { ok: true; email: string; role: "MANAGER" | "WORKER" | "ADMIN"; companyId: string };

function strengthScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 5);
}

function strengthLabel(score: number) {
  if (score <= 1) return "Faible";
  if (score === 2) return "Moyen";
  if (score === 3) return "Correct";
  if (score === 4) return "Fort";
  return "Très fort";
}

export default function SetPasswordClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => sp.get("token") || "", [sp]);

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [companyName, setCompanyName] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) return;
      setInviteErr(null);
      try {
        const res = await fetch(`/api/auth/invite-info?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const j = await res.json().catch(() => null);
        if (!res.ok) throw new Error(j?.error || "BAD_TOKEN");
        if (!cancelled) setInvite(j as InviteInfo);
      } catch (e: any) {
        if (!cancelled) setInviteErr(e?.message || "BAD_TOKEN");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const score = strengthScore(password);
  const pwOk = password.length >= 8;
  const matchOk = password === confirm && confirm.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!token) {
      setMsg("Lien invalide.");
      return;
    }
    if (!pwOk) {
      setMsg("Mot de passe trop court (minimum 8 caractères).");
      return;
    }
    if (!matchOk) {
      setMsg("La confirmation ne correspond pas.");
      return;
    }
    if (invite?.role === "MANAGER" && !companyName.trim()) {
      setMsg("Nom d'entreprise requis pour activer un compte MANAGER.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password,
        companyName: invite?.role === "MANAGER" ? companyName.trim() : undefined,
      }),
    });

    const j = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      const err = j?.error ? String(j.error) : "Erreur. Réessaie.";
      if (err === "COMPANY_REQUIRED") setMsg("Nom d'entreprise requis.");
      else if (err === "BAD_TOKEN") setMsg("Lien invalide ou expiré.");
      else setMsg(`Erreur: ${err}`);
      return;
    }

    setMsg("✅ Compte activé. Redirection...");
    setTimeout(() => router.push("/dashboard"), 700);
  }

  return (
    <div className="mt-6">
      <H1>Définir un mot de passe</H1>
      <Card className="mt-4">
        {!token ? (
          <div className="text-sm text-red-300">Lien invalide.</div>
        ) : inviteErr ? (
          <div className="text-sm text-red-300">Lien invalide ou expiré.</div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="text-sm text-zinc-400">
              Ce lien est valable une seule fois. Choisis un mot de passe pour activer ton accès.
              {invite?.email ? <div className="mt-1">Compte : <span className="text-zinc-200">{invite.email}</span></div> : null}
              {invite?.role ? <div>Rôle : <span className="text-zinc-200">{invite.role}</span></div> : null}
            </div>

            {invite?.role === "MANAGER" ? (
              <div>
                <Label>Nom de l'entreprise</Label>
                <input
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: ClairProjet"
                  autoComplete="organization"
                />
                <div className="mt-1 text-xs text-zinc-500">
                  Obligatoire pour activer un compte MANAGER.
                </div>
              </div>
            ) : null}

            <div>
              <Label>Nouveau mot de passe</Label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-600"
                >
                  {showPw ? "Masquer" : "Afficher"}
                </button>
              </div>

              <div className="mt-2">
                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-2 rounded-full bg-blue-600 transition-all"
                    style={{ width: `${(score / 5) * 100}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>Sécurité : <span className="text-zinc-200">{strengthLabel(score)}</span></span>
                  <span>{password.length}/64</span>
                </div>
              </div>
            </div>

            <div>
              <Label>Confirmer le mot de passe</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-zinc-600"
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              {confirm.length > 0 && !matchOk ? (
                <div className="mt-1 text-xs text-rose-300">La confirmation ne correspond pas.</div>
              ) : null}
            </div>

            <Btn type="submit" disabled={loading || !token || !pwOk || !matchOk || (invite?.role === "MANAGER" && !companyName.trim())}>
              {loading ? "Validation..." : "Valider"}
            </Btn>

            {msg ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                {msg}
              </div>
            ) : null}
          </form>
        )}
      </Card>
    </div>
  );
}
