"use client";

import { useState } from "react";
import { Btn, Card, H1, Label } from "../_ui/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@clairprojet.fr");
  const [password, setPassword] = useState("Test123456!");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/auth/login", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      setMsg("Identifiants invalides.");
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4">
        <H1>Connexion</H1>
        <p className="mt-1 text-sm text-zinc-400">
          Accède à ton tableau de bord Rentabilise.me.
        </p>
      </div>

      <Card>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Email</Label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div>
            <Label>Mot de passe</Label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>

          {msg && (
            <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {msg}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Btn type="submit" disabled={loading}>
              {loading ? "Connexion..." : "Se connecter"}
            </Btn>
            <Btn href="/" variant="secondary">
              Retour
            </Btn>
          </div>

          <div className="pt-1 text-xs">
            <a className="text-zinc-400 hover:text-zinc-200" href="/forgot-password">
              Mot de passe oublié ?
            </a>
          </div>
        </form>
      </Card>
    </div>
  );
}
