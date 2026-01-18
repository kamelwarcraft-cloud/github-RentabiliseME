"use client";

import { useEffect, useState } from "react";
import { Card, H1, H2, Label, Btn } from "@/app/_ui/ui";

type MeRes = {
  auth: { userId: string; companyId: string; role: string } | null;
  company: { id: string; name: string; hourlyCostCents: number; overheadRateBps: number } | null;
};

type ConfigRes = {
  betaMode: boolean;
  betaLimits: boolean;
  limits: { maxActiveProjects: number; maxMembers: number };
  pricing: { monthlyEur: number };
};

export default function ProfilePage() {
  const [me, setMe] = useState<MeRes | null>(null);
  const [config, setConfig] = useState<ConfigRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [hourlyCost, setHourlyCost] = useState("45");
  const [overhead, setOverhead] = useState("0");

  const [inviteEmail, setInviteEmail] = useState("");
  // Depuis Profil: un MANAGER ne doit pouvoir inviter que des WORKERS
  const [inviteRole, setInviteRole] = useState<"WORKER" | "MANAGER">("WORKER");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/me", { credentials: "include" });
      if (!r.ok) throw new Error("UNAUTHORIZED");
      const j = (await r.json()) as MeRes;
      setMe(j);
      setHourlyCost(((j.company?.hourlyCostCents ?? 0) / 100).toString());
      setOverhead(((j.company?.overheadRateBps ?? 0) / 100).toString());
      // Flags produit (bêta, limites, prix)
      const cr = await fetch("/api/config", { credentials: "include" }).catch(() => null);
      if (cr && cr.ok) {
        const cj = (await cr.json()) as ConfigRes;
        setConfig(cj);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        hourlyCost: Number(hourlyCost),
        overheadRate: Number(overhead),
      }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j.error || "Erreur");
      return;
    }
    await refresh();
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteUrl(null);
    setErr(null);
    const r = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: inviteEmail, role: (me?.auth?.role === "MANAGER" ? "WORKER" : inviteRole) }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(j.error || "Erreur");
      return;
    }
    setInviteUrl(j.inviteUrl);
  }

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-10 text-zinc-300">Chargement…</div>;

  const betaMode = config?.betaMode ?? true;
  const betaLimits = config?.betaLimits ?? true;
  const price = config?.pricing?.monthlyEur ?? 14.99;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <H1>Profil</H1>
        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200">{me?.auth?.role === "ADMIN" ? "Admin" : me?.auth?.role || ""}</span>
      </div>

      {err ? <div className="mt-4 text-sm text-red-300">{err}</div> : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <H2>Paramètres entreprise</H2>
          <div className="mt-2 text-sm text-zinc-400">
            Entreprise : <span className="text-zinc-200">{me?.company?.name ?? "-"}</span>
          </div>
          <form className="mt-4 grid gap-4" onSubmit={saveCompany}>
            <div>
              <Label>Coût horaire (€/h)</Label>
              <input className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={hourlyCost} onChange={(e) => setHourlyCost(e.target.value)} />
            </div>
            <div>
              <Label>Frais généraux (%)</Label>
              <input className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={overhead} onChange={(e) => setOverhead(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Btn type="submit">Enregistrer</Btn>
            </div>
          </form>
        </Card>

        <Card>
          <H2>Inviter un utilisateur</H2>
          <div className="mt-2 text-sm text-zinc-400">Version bêta : simple lien à copier.</div>
          <form className="mt-4 grid gap-3" onSubmit={createInvite}>
            <div>
              <Label>Email</Label>
              <input className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="ouvrier@entreprise.fr" />
            </div>
            {me?.auth?.role === "ADMIN" ? (
              <div>
                <Label>Rôle</Label>
                <select className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
                  <option value="WORKER">WORKER</option>
                  <option value="MANAGER">MANAGER</option>
                </select>
              </div>
            ) : (
              <div className="text-sm text-zinc-400">
                Rôle:{" "}
                <span className="inline-flex items-center rounded-xl bg-zinc-800/40 px-3 py-1 text-xs font-semibold text-zinc-200 ring-1 ring-zinc-700/60">
                  WORKER
                </span>
              </div>
            )}
            <div className="flex justify-end">
              <Btn type="submit">Créer le lien</Btn>
            </div>
          </form>
          {inviteUrl ? (
            <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">
              <div className="text-zinc-400">Lien :</div>
              <div className="break-all text-zinc-100">{inviteUrl}</div>
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="mt-6">
        <H2>Plan</H2>
        {betaMode ? (
          <div className="mt-2 text-sm text-zinc-300">
            Tu es en <span className="font-semibold">mode bêta</span> (gratuit).
            {betaLimits ? (
              <ul className="mt-2 list-disc pl-5 text-sm text-zinc-300">
                <li>3 activités actives maximum (par entreprise)</li>
                <li>1 utilisateur (limite volontaire)</li>
                <li>Export PDF avec watermark</li>
              </ul>
            ) : (
              <div className="mt-2 text-sm text-zinc-400">Limites désactivées (BETA_LIMIT=OFF).</div>
            )}
          </div>
        ) : (
          <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-zinc-100">Abonnement (placeholder)</div>
            <div className="mt-1 text-sm text-zinc-400">
              Mode payant activé (BETA_MODE=OFF). Ici tu mettras le paiement/abonnement.
            </div>
            <div className="mt-3 text-sm text-zinc-300">
              Prix prévu : <span className="font-semibold">{price.toFixed(2).replace(".", ",")}€ / mois</span>
            </div>
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <H2>Sécurité</H2>
        <div className="mt-2 text-sm text-zinc-400">Changer ton mot de passe</div>
        <ChangePassword />
      </Card>
    </main>
  );
}

function ChangePassword() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const r = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    }).catch(() => null);
    setLoading(false);
    if (!r || !r.ok) {
      const j = await r?.json().catch(() => ({}));
      setMsg(j?.error || "Erreur");
      return;
    }
    setMsg("Mot de passe modifié ✅");
    setCurrent("");
    setNext("");
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2">
      <div>
        <Label>Mot de passe actuel</Label>
        <input className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <Label>Nouveau mot de passe</Label>
        <input className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm" type="password" value={newPassword} onChange={(e) => setNext(e.target.value)} />
      </div>
      <div className="md:col-span-2 flex items-center justify-between gap-3">
        {msg ? <div className="text-sm text-zinc-300">{msg}</div> : <div />}
        <Btn type="submit" disabled={loading}>Enregistrer</Btn>
      </div>
    </form>
  );
}
