"use client";

import { useState } from "react";
import { Btn, Card, H1, Label } from "../../_ui/ui";

export default function NewProjectPage() {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [revenue, setRevenue] = useState(2500);
  const [plannedLaborHours, setPlannedLaborHours] = useState(20);
  const [plannedMaterials, setPlannedMaterials] = useState(600);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/projects", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        clientName: clientName || undefined,
        address: address || undefined,
        revenue: Number(revenue),
        plannedLaborHours: Number(plannedLaborHours),
        plannedMaterials: Number(plannedMaterials),
      }),
    });

    setLoading(false);

    const j = await res.json().catch(() => null);
    if (!res.ok) {
      setMsg(j?.error ?? "Erreur.");
      return;
    }

    window.location.href = `/projects/${j.project.id}`;
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <H1>Nouveau projet</H1>
        <div className="mt-1 text-sm text-zinc-400">
          30 secondes pour créer un projet (parfait en démo).
        </div>
      </div>

      <Card>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Nom projet</Label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-sky-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rénovation cuisine, Tableau elec, Clim…"
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Client</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
            <div>
              <Label>Adresse</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Optionnel"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>Revenus (€)</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value))}
                min={0}
                step="0.01"
              />
            </div>
            <div>
              <Label>MO prévue (h)</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                type="number"
                value={plannedLaborHours}
                onChange={(e) => setPlannedLaborHours(Number(e.target.value))}
                min={0}
                step="0.25"
              />
            </div>
            <div>
              <Label>Matériaux (€)</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                type="number"
                value={plannedMaterials}
                onChange={(e) => setPlannedMaterials(Number(e.target.value))}
                min={0}
                step="0.01"
              />
            </div>
          </div>

          {msg && (
            <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">
              {msg}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Btn type="submit" disabled={loading}>
              {loading ? "Création..." : "Créer"}
            </Btn>
            <Btn href="/dashboard" variant="secondary">
              Annuler
            </Btn>
          </div>
        </form>
      </Card>
    </div>
  );
}
