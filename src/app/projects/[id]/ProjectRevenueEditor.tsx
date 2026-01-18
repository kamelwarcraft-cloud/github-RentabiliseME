"use client";

import { useState, useEffect } from "react";
import { Card, Label, euros } from "../../_ui/ui";

export default function ProjectRevenueEditor({
  projectId,
  initialRevenueCents,
  userRole,
  onUpdate,
  onLiveChange,
  onCancel,
}: {
  projectId: string;
  initialRevenueCents: number;
  userRole: "ADMIN" | "MANAGER" | "WORKER";
  /** Appelé après sauvegarde (valeur persistée) */
  onUpdate?: (newRevenueCents: number) => void;
  /** Appelé à chaque frappe pendant l'édition (valeur "draft") */
  onLiveChange?: (draftRevenueCents: number) => void;
  /** Appelé quand on annule l'édition */
  onCancel?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [revenueCents, setRevenueCents] = useState(initialRevenueCents);
  const [saving, setSaving] = useState(false);

  // Synchroniser avec les changements de initialRevenueCents
  useEffect(() => {
    setRevenueCents(initialRevenueCents);
  }, [initialRevenueCents]);

  const canEdit = userRole === "ADMIN" || userRole === "MANAGER";

  async function saveRevenue() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ revenueCents }),
      });

      if (res.ok) {
        setIsEditing(false);
        // Notifier le parent pour recharger les données
        onUpdate?.(revenueCents);
      } else {
        alert("Erreur lors de la mise à jour");
        setSaving(false);
      }
    } catch (error) {
      alert("Erreur réseau");
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <Label>Revenus du projet</Label>
          {isEditing ? (
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                step="0.01"
                value={revenueCents / 100}
                onChange={(e) => {
                  const next = Math.round(Number(e.target.value) * 100);
                  setRevenueCents(next);
                  onLiveChange?.(next);
                }}
                className="w-48 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-lg font-semibold"
                autoFocus
              />
              <span className="text-lg">€</span>
            </div>
          ) : (
            <div className="mt-1 text-2xl font-semibold">{euros(revenueCents)}</div>
          )}
        </div>

        {canEdit && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={saveRevenue}
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "..." : "Sauvegarder"}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setRevenueCents(initialRevenueCents);
                    onCancel?.();
                  }}
                  disabled={saving}
                  className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium hover:bg-zinc-600 disabled:opacity-50"
                >
                  Annuler
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setIsEditing(true);
                  // pousser la valeur actuelle dès l'ouverture pour synchro immédiate
                  onLiveChange?.(revenueCents);
                }}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium hover:bg-zinc-700"
              >
                Modifier
              </button>
            )}
          </div>
        )}
      </div>

      {!isEditing && canEdit && (
        <div className="mt-2 text-xs text-zinc-400">
          Vous pouvez modifier le CA en tant que {userRole}
        </div>
      )}
    </Card>
  );
}
