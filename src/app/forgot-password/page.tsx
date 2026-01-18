"use client";

import { useState } from "react";
import { Btn, Card, H1, Label } from "../_ui/ui";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-4">
        <H1>Mot de passe oublié</H1>
        <p className="mt-1 text-sm text-zinc-400">On t'envoie un lien de réinitialisation par email.</p>
      </div>

      <Card>
        {sent ? (
          <div className="text-sm text-zinc-200">
            Si l'email existe, tu vas recevoir un lien dans quelques instants.
          </div>
        ) : (
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
            <div className="flex gap-2 pt-2">
              <Btn type="submit" disabled={loading}>{loading ? "Envoi..." : "Envoyer le lien"}</Btn>
              <Btn href="/login" variant="secondary">Retour</Btn>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
