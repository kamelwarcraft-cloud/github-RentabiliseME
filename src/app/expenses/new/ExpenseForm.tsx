"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Btn, Card, H1, Label } from "../../_ui/ui";

export default function ExpenseForm() {
  const sp = useSearchParams();
  const projectId = sp.get("projectId") || "";

  const [amount, setAmount] = useState(50);
  const [category, setCategory] = useState<"MATERIAL" | "RENTAL" | "TRAVEL" | "SUBCONTRACT" | "OTHER">("MATERIAL");
  const [vendor, setVendor] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  async function loadRecent() {
    if (!projectId) return;
    const r = await fetch(`/api/expenses?projectId=${encodeURIComponent(projectId)}&limit=3`, { credentials: "include" });
    if (r.ok) {
      const j = await r.json().catch(() => null);
      setRecent(j?.items ?? []);
    }
  }

  useEffect(() => {
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const res = await fetch("/api/expenses", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        date: new Date(date).toISOString(),
        category,
        amount: Number(amount),
        vendor: vendor || undefined,
        note: note || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      setMsg("Erreur. Vérifie le chantier / connexion.");
      return;
    }
    setMsg("✅ Ajouté.");
    setVendor("");
    setNote("");
    await loadRecent();
  }

  async function undo(id: string) {
    const r = await fetch("/api/expenses", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (r.ok) {
      setMsg("Annulé.");
      await loadRecent();
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <H1>Ajouter une dépense</H1>
      <p className="mt-1 text-sm text-zinc-400">Saisie rapide + catégorie.</p>

      <Card>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Date/heure</Label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Montant (€)</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={0}
                step="0.01"
                required
              />
            </div>

            <div>
              <Label>Catégorie</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                <button type="button" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800" onClick={() => { setCategory("MATERIAL"); setVendor("Leroy Merlin"); }}>Matériel</button>
                <button type="button" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800" onClick={() => { setCategory("TRAVEL"); setVendor("Carburant"); }}>Carburant</button>
                <button type="button" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800" onClick={() => { setCategory("RENTAL"); setVendor("Location"); }}>Location</button>
                <button type="button" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800" onClick={() => { setCategory("SUBCONTRACT"); setVendor("Sous-traitance"); }}>Sous-traitance</button>
              </div>
              <select
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
              >
                <option value="MATERIAL">Matériaux</option>
                <option value="RENTAL">Location</option>
                <option value="TRAVEL">Déplacement</option>
                <option value="SUBCONTRACT">Sous-traitance</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Fournisseur</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="Optionnel"
              />
            </div>

            <div>
              <Label>Note</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optionnel"
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
              {loading ? "Ajout..." : "Valider"}
            </Btn>
            <Btn href={`/projects/${projectId}`} variant="secondary">Retour chantier</Btn>
          </div>
        </form>
      </Card>

      {recent.length > 0 ? (
        <Card>
          <Label>Dernières saisies</Label>
          <div className="mt-2 space-y-2">
            {recent.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm">
                <div className="text-zinc-200">
                  <span className="font-semibold">{(it.amountCents / 100).toFixed(2).replace(".", ",")}€</span>
                  <span className="text-zinc-400"> • {it.category}</span>
                  {it.vendor ? <span className="text-zinc-500"> • {it.vendor}</span> : null}
                </div>
                <button type="button" className="text-xs text-zinc-300 hover:text-white" onClick={() => undo(it.id)}>Annuler</button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
