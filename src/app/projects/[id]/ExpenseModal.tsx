"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";

export default function ExpenseModal({
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
    amount: "",
    category: "MATERIAL",
    vendor: "",
    note: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.amount || Number(formData.amount) <= 0) {
      setError("Veuillez saisir un montant valide");
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        projectId,
        date: formData.date,
        amount: Number(formData.amount),
        category: formData.category,
      };

      // N'envoyer vendor et note que s'ils sont remplis
      if (formData.vendor.trim()) {
        payload.vendor = formData.vendor;
      }
      if (formData.note.trim()) {
        payload.note = formData.note;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Réinitialiser le formulaire
        setFormData({
          date: new Date().toISOString().split("T")[0],
          amount: "",
          category: "MATERIAL",
          vendor: "",
          note: "",
        });
        // Fermer le modal
        onClose();
        // Notifier le parent pour recharger les données
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
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter une dépense">
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

        {/* Montant */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Montant (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        {/* Catégorie */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Catégorie
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="MATERIAL">Matériel</option>
            <option value="RENTAL">Location</option>
            <option value="TRAVEL">Déplacement</option>
            <option value="SUBCONTRACT">Sous-traitance</option>
            <option value="OTHER">Autre</option>
          </select>
        </div>

        {/* Fournisseur */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Fournisseur (optionnel)
          </label>
          <input
            type="text"
            placeholder="Ex: Leroy Merlin"
            value={formData.vendor}
            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Note (optionnel)
          </label>
          <textarea
            placeholder="Détails de la dépense..."
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
