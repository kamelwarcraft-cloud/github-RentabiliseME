"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Btn, Card, H1, Label } from "../../_ui/ui";

export default function TimeForm() {
  const sp = useSearchParams();
  const projectId = sp.get("projectId") || "";

  const [minutes, setMinutes] = useState(60);
  const [task, setTask] = useState("Pose");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [recent, setRecent] = useState<any[]>([]);

  async function loadRecent() {
    if (!projectId) return;
    const r = await fetch(`/api/time-entries?projectId=${encodeURIComponent(projectId)}&limit=3`, {
      credentials: "include",
    });
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

    const res = await fetch("/api/time-entries", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        date: new Date(date).toISOString(),
        minutes: Number(minutes),
        task: task || undefined,
        note: note || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      setMsg("Erreur. Vérifie le chantier ou ta connexion.");
      return;
    }

    setMsg("✅ Ajouté.");
    setNote("");
    await loadRecent();
  }

  async function undo(id: string) {
    const r = await fetch("/api/time-entries", {
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
      <H1>Ajouter des heures</H1>
      <p className="mt-1 text-sm text-zinc-400">
        Saisie rapide terrain (mobile-friendly).
      </p>

      <Card>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Date / heure</Label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Durée (minutes)</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                <button type="button" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800" onClick={() => setMinutes((m) => m + 30)}>+30m</button>
                <button type="button" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800" onClick={() => setMinutes((m) => m + 60)}>+1h</button>
                <button type="button" className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-800" onClick={() => setMinutes((m) => m + 120)}>+2h</button>
              </div>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <Label>Tâche</Label>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Pose, câblage, finition…"
              />
            </div>
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
                  <span className="font-semibold">{Math.round((it.minutes / 60) * 10) / 10}h</span>
                  {it.task ? <span className="text-zinc-400"> • {it.task}</span> : null}
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
