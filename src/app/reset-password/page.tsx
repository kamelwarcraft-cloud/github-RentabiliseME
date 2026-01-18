"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Btn, Card, H1, Label } from "../_ui/ui";

function Inner() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const [pw, setPw] = useState("");
  const [ok, setOk] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const r = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: pw }),
    }).catch(() => null);
    setLoading(false);
    if (!r || !r.ok) {
      const j = await r?.json().catch(() => ({}));
      setMsg(j?.error || "Erreur");
      return;
    }
    setOk(true);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4">
        <H1>Réinitialiser le mot de passe</H1>
        <p className="mt-1 text-sm text-zinc-400">Choisis un nouveau mot de passe (8 caractères min).</p>
      </div>

      <Card>
        {ok ? (
          <div className="space-y-3 text-sm text-zinc-200">
            <div>Mot de passe mis à jour ✅</div>
            <Btn href="/login">Se connecter</Btn>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Nouveau mot de passe</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type="password"
                required
              />
            </div>
            {msg ? (
              <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
                {msg}
              </div>
            ) : null}
            <div className="flex gap-2 pt-2">
              <Btn type="submit" disabled={loading || !token}>{loading ? "..." : "Valider"}</Btn>
              <Btn href="/login" variant="secondary">Annuler</Btn>
            </div>
            {!token ? <div className="text-xs text-amber-300">Token manquant (lien invalide).</div> : null}
          </form>
        )}
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
