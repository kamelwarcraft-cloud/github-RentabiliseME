"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

export default function TimeEntryModal({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    hours: "",
    minutes: "",
    task: "",
    note: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const totalMinutes = (Number(formData.hours) || 0) * 60 + (Number(formData.minutes) || 0);

    if (totalMinutes === 0) {
      setError("Veuillez saisir une durée");
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        projectId,
        date: formData.date,
        minutes: totalMinutes,
      };

      // N'envoyer task et note que s'ils sont remplis
      if (formData.task.trim()) {
        payload.task = formData.task;
      }
      if (formData.note.trim()) {
        payload.note = formData.note;
      }

      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Réinitialiser le formulaire
        setFormData({
          date: new Date().toISOString().split("T")[0],
          hours: "",
          minutes: "",
          task: "",
          note: "",
        });
        // Fermer le modal
        onClose();
        // Notifier le parent pour recharger les données en arrière-plan
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const data = await res.json();
        setError(data.error || "Erreur lors de l'ajout");
      }
    } catch (err) {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter des heures">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* Durée */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Durée
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                type="number"
                min="0"
                placeholder="Heures"
                value={formData.hours}
                onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="mt-1 text-xs text-zinc-500">Heures</div>
            </div>
            <div>
              <input
                type="number"
                min="0"
                max="59"
                placeholder="Minutes"
                value={formData.minutes}
                onChange={(e) => setFormData({ ...formData, minutes: e.target.value })}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="mt-1 text-xs text-zinc-500">Minutes</div>
            </div>
          </div>
        </div>

        {/* Tâche */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Tâche (optionnel)
          </label>
          <input
            type="text"
            placeholder="Ex: Installation électrique"
            value={formData.task}
            onChange={(e) => setFormData({ ...formData, task: e.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Note (optionnel)
          </label>
          <textarea
            placeholder="Détails supplémentaires..."
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ajout..." : "Ajouter"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
