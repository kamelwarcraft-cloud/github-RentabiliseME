"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Btn, Card, H1, Label, euros } from "../../_ui/ui";
import type { ProjectLifecycle } from "@prisma/client";
import TimeEntryModal from "./TimeEntryModal";
import ExpenseModal from "./ExpenseModal";

type ProfitStatus = "RENTABLE" | "A_RISQUE" | "NON_RENTABLE";
type Lifecycle = "ACTIVE" | "DONE";

type Financials = {
  revenueCents: number;
  actual: {
    laborMinutes: number;
    laborCostCents: number;
    materialsCents: number;
    subcontractCents: number;
    otherCents: number;
    overheadCents: number;
    totalCostsCents: number;
  };
  planned?: {
    laborMinutes: number;
    materialsCents: number;
    subcontractCents: number;
    otherCents: number;
  };
  marginCents: number;
  marginPct: number;
  status: ProfitStatus;
  breakEvenRemainingMinutes?: number;
};

type ApiRes = {
  project: { id: string; name: string; lifecycle: Lifecycle };
  financials: Financials;
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function minutesToHours(min: number) {
  return round1(min / 60);
}

function lifecycleLabel(l: Lifecycle) {
  return l === "DONE" ? "TERMINÉ" : "EN COURS";
}

function wowSentence(f: Financials) {
  const be = f.breakEvenRemainingMinutes ?? 0;
  const beAbs = minutesToHours(Math.abs(be));
  const beMsg =
    be > 0
      ? `Il te reste ~${beAbs}h avant d'être en perte.`
      : be < 0
      ? `Tu as dépassé le seuil de rentabilité de ~${beAbs}h.`
      : `Tu es au seuil de rentabilité.`;

  if (f.status === "RENTABLE") {
    return `Tu gagnes actuellement ~${euros(f.marginCents)}. ${beMsg}`;
  }
  if (f.status === "A_RISQUE") {
    return `Attention, tu arrives au seuil de rentabilité. ${beMsg}`;
  }
  return `Tu perds actuellement ~${euros(Math.abs(f.marginCents))}. ${beMsg}`;
}

export default function ProjectClient({
  projectId,
  onDataChanged,
  revenueOverrideCents,
}: {
  projectId: string;
  onDataChanged?: () => void;
  /**
   * Permet d'afficher un CA "en cours d'édition" (sans forcément être sauvegardé)
   * afin que les widgets restent synchronisés en temps réel.
   */
  revenueOverrideCents?: number | null;
}) {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string>("...");
  const [lifecycle, setLifecycle] = useState<ProjectLifecycle>("ACTIVE");
  const [fin, setFin] = useState<Financials | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"REEL" | "PREVU" | "ECART">("REEL");
  const [busy, setBusy] = useState(false);
  
  // États pour les modals
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  
  // État local optionnel (utile si on déclenche un refresh sans remonter au parent)
  const [needsRefresh, setNeedsRefresh] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setErr(null);

    if (!projectId) {
      setErr("ID_PROJET_MANQUANT");
      setLoading(false);
      return;
    }

    const r = await fetch(`/api/projects/${projectId}/dashboard`, { 
      credentials: "include",
      cache: "no-store" // Toujours récupérer les données fraîches
    });
    const j: ApiRes | any = await r.json().catch(() => null);

    if (!r.ok) {
      setErr(j?.error ?? `Erreur (${r.status})`);
      setLoading(false);
      return;
    }

    setName(j.project?.name ?? "Projet");
    setLifecycle(j.project?.lifecycle ?? "ACTIVE");
    setFin(j.financials ?? null);
    setLoading(false);
    setNeedsRefresh(false);
  }

  // Chargement initial
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Polling intelligent : recharger automatiquement quand needsRefresh est true
  useEffect(() => {
    if (!needsRefresh) return;

    // Attendre 500ms puis recharger en silence
    const timeout = setTimeout(() => {
      load(true); // silent = true pour pas montrer le loader
    }, 500);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsRefresh]);

  // Fonction à appeler quand on ajoute/modifie quelque chose
  function triggerRefresh() {
    // 1) Met à jour ce widget
    setNeedsRefresh(true);
    // 2) Remonte l'info pour rafraîchir les autres widgets (gestion des saisies, etc.)
    onDataChanged?.();
  }

  async function toggleLifecycle() {
    setBusy(true);
    try {
      const next: ProjectLifecycle = lifecycle === "DONE" ? "ACTIVE" : "DONE";

      const r = await fetch(`/api/projects/${projectId}/lifecycle`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lifecycle: next }),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok) {
        setErr(j?.error ?? "BAD_REQUEST");
        return;
      }

      setLifecycle(j.lifecycle);
    } finally {
      setBusy(false);
    }
  }

  // Utiliser le CA "draft" pour recalculer les KPI en temps réel (marge, % etc.)
  const effectiveFin = useMemo(() => {
    if (!fin) return null;
    return revenueOverrideCents != null ? { ...fin, revenueCents: revenueOverrideCents } : fin;
  }, [fin, revenueOverrideCents]);

  const computed = useMemo(() => {
    if (!effectiveFin) return null;

    const plannedLaborMinutes = effectiveFin.planned?.laborMinutes ?? 0;

    const hourlyCents =
      effectiveFin.actual.laborMinutes > 0
        ? Math.round((effectiveFin.actual.laborCostCents * 60) / effectiveFin.actual.laborMinutes)
        : 0;

    const plannedLaborCostCents = Math.round((plannedLaborMinutes / 60) * hourlyCents);

    const plannedOtherCostsCents =
      (effectiveFin.planned?.materialsCents ?? 0) +
      (effectiveFin.planned?.subcontractCents ?? 0) +
      (effectiveFin.planned?.otherCents ?? 0);

    const plannedTotalCostsCents = plannedLaborCostCents + plannedOtherCostsCents;
    const plannedMarginCents = effectiveFin.revenueCents - plannedTotalCostsCents;
    const plannedMarginPct =
      effectiveFin.revenueCents > 0 ? (plannedMarginCents / effectiveFin.revenueCents) * 100 : 0;

    const actualOtherCostsCents =
      (effectiveFin.actual.materialsCents ?? 0) +
      (effectiveFin.actual.subcontractCents ?? 0) +
      (effectiveFin.actual.otherCents ?? 0);

    return {
      hourlyCents,
      plannedLaborCostCents,
      plannedOtherCostsCents,
      plannedTotalCostsCents,
      plannedMarginCents,
      plannedMarginPct,
      actualOtherCostsCents,
      wow: wowSentence(effectiveFin),
    };
  }, [effectiveFin]);


  const tips = useMemo(() => {
    if (!effectiveFin) return [] as { title: string; detail: string }[];
    const t: { title: string; detail: string }[] = [];
    const targetPct = 20;
    const costs = Math.max(0, effectiveFin.actual.totalCostsCents || 0);
    const revenue = Math.max(0, effectiveFin.revenueCents || 0);
    const currentPct = revenue > 0 ? ((revenue - costs) / revenue) * 100 : 0;

    if (revenue === 0) {
      t.push({
        title: "Renseigne le montant du projet",
        detail: "Sans revenus, l’outil ne peut pas mesurer la rentabilité. Mets au moins une estimation.",
      });
    } else if (currentPct < targetPct) {
      const requiredRevenue = Math.round(costs / (1 - targetPct / 100));
      const delta = Math.max(0, requiredRevenue - revenue);
      t.push({
        title: `Objectif ${targetPct}% de marge`,
        detail: delta > 0 ? `À coûts constants, il manque environ ${euros(delta)} de revenus (devis / avenant / ajustement).` : "Tu es déjà au-dessus de l’objectif.",
      });
    } else {
      t.push({
        title: `Objectif ${targetPct}% de marge`,
        detail: "✅ Tu es au-dessus de l’objectif. Pense à sécuriser la facturation et le suivi.",
      });
    }

    // Dépassement par rapport au prévu (si disponible)
    const planned = effectiveFin.planned;
    if (planned) {
      // planned n'a pas laborCostCents ni overheadCents, seulement laborMinutes
      // On calcule le coût main d'œuvre à partir des minutes
      const hourlyCostCents = 5000; // 50€/h par défaut (à adapter selon company.hourlyCostCents si disponible)
      const plannedLaborCostCents = Math.round((planned.laborMinutes / 60) * hourlyCostCents);
      
      const plannedTotal =
        Math.max(0, plannedLaborCostCents) +
        Math.max(0, planned.materialsCents || 0) +
        Math.max(0, planned.subcontractCents || 0) +
        Math.max(0, planned.otherCents || 0);
      
      if (plannedTotal > 0 && costs > plannedTotal * 1.1) {
        t.push({
          title: "Coûts au-dessus du prévu",
          detail: `Tu es à ${euros(costs)} vs prévu ${euros(plannedTotal)}. Vérifie les heures, achats et sous-traitance.`,
        });
      }
    }

    const labor = Math.max(0, effectiveFin.actual.laborCostCents || 0);
    if (costs > 0 && labor / costs > 0.6) {
      t.push({
        title: "Le temps pèse lourd dans les coûts",
        detail: "Astuce manager: isole les tâches chronophages, délègue ce qui est répétitif, et garde les tâches à forte valeur.",
      });
    }

    return t.slice(0, 4);
  }, [effectiveFin]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <H1>Projet</H1>
        <p className="mt-1 text-sm text-zinc-400">Chargement…</p>
      </div>
    );
  }

  if (err || !effectiveFin || !computed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <H1>Projet</H1>
        <Card>
          <div className="text-sm text-red-200">Impossible de charger: {err ?? "UNKNOWN"}</div>
          <div className="mt-3 flex gap-2">
            <Btn href="/dashboard" variant="secondary">
              Retour
            </Btn>
            <Btn href="/login">Se reconnecter</Btn>
          </div>
        </Card>
      </div>
    );
  }

  const f = effectiveFin;

  return (
    <>
      {/* Modals */}
      <TimeEntryModal
        isOpen={timeModalOpen}
        onClose={() => setTimeModalOpen(false)}
        projectId={projectId}
        onSuccess={triggerRefresh}
      />
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        projectId={projectId}
        onSuccess={triggerRefresh}
      />

      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <H1>{name}</H1>
            <div className="mt-1 text-sm text-zinc-400">ID: {projectId}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTimeModalOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 transition"
            >
              + Heures
            </button>
            <button
              onClick={() => setExpenseModalOpen(true)}
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 transition"
            >
              + Dépense
            </button>

            <a
              className="inline-flex items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
              href={`/api/projects/${projectId}/report`}
              target="_blank"
              rel="noreferrer"
            >
              Export PDF
            </a>

            <Btn href="/dashboard" variant="ghost">
              Dashboard
            </Btn>
          </div>
        </div>

        {/* Lifecycle */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>Statut du projet</Label>
              <div className="mt-1 text-sm font-semibold text-zinc-100">{lifecycleLabel(lifecycle)}</div>
            </div>
            <Btn onClick={toggleLifecycle} disabled={busy} variant={lifecycle === "DONE" ? "secondary" : "primary"}>
              {busy ? "…" : lifecycle === "DONE" ? "Repasser en cours" : "Marquer terminé"}
            </Btn>
          </div>
        </Card>

        {/* WOW WIDGET */}
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Label>Rentabilité instantanée</Label>

              <div className="mt-2 flex items-center gap-3">
                <Badge status={f.status} />
                <div className="text-sm font-semibold text-zinc-100">
                  {f.status === "RENTABLE" ? "RENTABLE" : f.status === "A_RISQUE" ? "À RISQUE" : "NON RENTABLE"}
                </div>
              </div>

              <div className="mt-2 text-sm text-zinc-300">{computed.wow}</div>

              {tips.length ? (
                <div className="mt-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
                  <div className="text-xs font-semibold text-zinc-300">Rentabiliser — recommandations</div>
                  <div className="mt-2 space-y-2">
                    {tips.map((t) => (
                      <div key={t.title} className="rounded-xl border border-zinc-900 bg-zinc-950/30 p-2">
                        <div className="text-sm font-medium text-zinc-100">{t.title}</div>
                        <div className="text-xs text-zinc-400">{t.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

            </div>

            <div className="text-left sm:text-right">
              <Label>Marge</Label>
              <div className="mt-1 text-2xl font-semibold">{euros(f.marginCents)}</div>
              <div className="text-sm text-zinc-400">{round1(f.marginPct)}%</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <Label>Revenus du projet</Label>
              <div className="mt-1 text-lg font-semibold">{euros(f.revenueCents)}</div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <Label>Coûts réels</Label>
              <div className="mt-1 text-lg font-semibold">{euros(f.actual.totalCostsCents)}</div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-3">
              <Label>Heures réelles</Label>
              <div className="mt-1 text-lg font-semibold">{minutesToHours(f.actual.laborMinutes)}h</div>
            </div>
          </div>
        </Card>

        {/* Onglets */}
        <Card>
          <div className="flex gap-2">
            <button
              onClick={() => setTab("REEL")}
              className={`rounded-xl px-3 py-2 text-sm ${tab === "REEL" ? "bg-zinc-900 text-white" : "text-zinc-300 hover:bg-zinc-900"}`}
            >
              Réel
            </button>
            <button
              onClick={() => setTab("PREVU")}
              className={`rounded-xl px-3 py-2 text-sm ${tab === "PREVU" ? "bg-zinc-900 text-white" : "text-zinc-300 hover:bg-zinc-900"}`}
            >
              Prévu
            </button>
            <button
              onClick={() => setTab("ECART")}
              className={`rounded-xl px-3 py-2 text-sm ${tab === "ECART" ? "bg-zinc-900 text-white" : "text-zinc-300 hover:bg-zinc-900"}`}
            >
              Écart
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-200">
            {tab === "REEL" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  Heures réalisées: <span className="font-semibold">{minutesToHours(f.actual.laborMinutes)}h</span>
                </div>
                <div>
                  Coût main d'œuvre: <span className="font-semibold">{euros(f.actual.laborCostCents)}</span>
                </div>
                <div>
                  Dépenses: <span className="font-semibold">{euros(computed.actualOtherCostsCents)}</span>
                </div>
                <div>
                  Coût total: <span className="font-semibold">{euros(f.actual.totalCostsCents)}</span>
                </div>
              </div>
            ) : tab === "PREVU" ? (
              f.planned ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    Heures prévues: <span className="font-semibold">{minutesToHours(f.planned.laborMinutes)}h</span>
                  </div>
                  <div>
                    Dépenses prévues: <span className="font-semibold">{euros(computed.plannedOtherCostsCents)}</span>
                  </div>
                  <div>
                    Coût total prévu: <span className="font-semibold">{euros(computed.plannedTotalCostsCents)}</span>
                  </div>
                  <div>
                    Marge prévue: <span className="font-semibold">{euros(computed.plannedMarginCents)} ({round1(computed.plannedMarginPct)}%)</span>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-400">Aucun budget (prévision) renseigné.</div>
              )
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  Heures:{" "}
                  <span className="font-semibold">
                    {f.planned
                      ? `${minutesToHours(f.planned.laborMinutes)}h → ${minutesToHours(f.actual.laborMinutes)}h`
                      : `${minutesToHours(f.actual.laborMinutes)}h (réel)`}
                  </span>
                </div>
                <div>
                  Coûts:{" "}
                  <span className="font-semibold">
                    {f.planned
                      ? `${euros(computed.plannedTotalCostsCents)} → ${euros(f.actual.totalCostsCents)}`
                      : euros(f.actual.totalCostsCents)}
                  </span>
                </div>
                <div>
                  Marge:{" "}
                  <span className="font-semibold">
                    {f.planned ? `${euros(computed.plannedMarginCents)} → ${euros(f.marginCents)}` : euros(f.marginCents)}
                  </span>
                </div>
                <div>
                  Impact:{" "}
                  <span className="font-semibold">{f.planned ? euros(f.marginCents - computed.plannedMarginCents) : "—"}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Btn href={`/api/projects/${projectId}/report`} variant="secondary">
              Exporter PDF
            </Btn>
          </div>
        </Card>
      </div>
    </>
  );
}
