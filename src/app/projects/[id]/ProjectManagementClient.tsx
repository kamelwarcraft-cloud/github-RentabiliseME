"use client";

import { useEffect, useState } from "react";
import { Card, Label, euros } from "../../_ui/ui";

type TimeEntry = {
  id: string;
  date: string;
  minutes: number;
  task: string | null;
  note: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

type Expense = {
  id: string;
  date: string;
  category: string;
  amountCents: number;
  vendor: string | null;
  note: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
  };
};

export default function ProjectManagementClient({
  projectId,
  userRole,
  userId,
  onDataChanged,
}: {
  projectId: string;
  userRole: "ADMIN" | "MANAGER" | "WORKER";
  userId: string;
  onDataChanged?: () => void;
}) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"HEURES" | "DEPENSES">("HEURES");
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  const canEdit = userRole === "ADMIN" || userRole === "MANAGER";
  const canDelete = userRole === "ADMIN" || userRole === "MANAGER"; // WORKER ne peut JAMAIS supprimer

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    try {
      const [timeRes, expenseRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/time-entries`, { credentials: "include" }),
        fetch(`/api/projects/${projectId}/expenses`, { credentials: "include" }),
      ]);

      const timeData = await timeRes.json();
      const expenseData = await expenseRes.json();

      setTimeEntries(timeData.entries || []);
      setExpenses(expenseData.expenses || []);
    } catch (err) {
      console.error("Erreur de chargement:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTimeEntry(id: string) {
    if (!confirm("Supprimer cette entrée d'heures ?")) return;

    const res = await fetch(`/api/time-entries`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setTimeEntries((prev) => prev.filter((e) => e.id !== id));
      // Rafraîchir les autres widgets (KPI, etc.) sans recharger toute la page
      onDataChanged?.();
    } else {
      const error = await res.json();
      alert(`Erreur: ${error.error || "Suppression impossible"}`);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Supprimer cette dépense ?")) return;

    const res = await fetch(`/api/expenses`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      onDataChanged?.();
    } else {
      const error = await res.json();
      alert(`Erreur: ${error.error || "Suppression impossible"}`);
    }
  }

  async function saveTimeEntry(id: string) {
    const res = await fetch(`/api/time-entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(editValues),
    });

    if (res.ok) {
      const data = await res.json();
      setTimeEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...data.entry } : e))
      );
      setEditingTimeId(null);
      setEditValues({});
      onDataChanged?.();
    } else {
      alert("Erreur lors de la modification");
    }
  }

  async function saveExpense(id: string) {
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(editValues),
    });

    if (res.ok) {
      const data = await res.json();
      setExpenses((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...data.expense } : e))
      );
      setEditingExpenseId(null);
      setEditValues({});
      onDataChanged?.();
    } else {
      alert("Erreur lors de la modification");
    }
  }

  function startEditTime(entry: TimeEntry) {
    setEditingTimeId(entry.id);
    setEditValues({
      date: entry.date.split("T")[0],
      minutes: entry.minutes,
      task: entry.task || "",
      note: entry.note || "",
    });
  }

  function startEditExpense(expense: Expense) {
    setEditingExpenseId(expense.id);
    setEditValues({
      date: expense.date.split("T")[0],
      amount: expense.amountCents / 100,
      category: expense.category,
      vendor: expense.vendor || "",
      note: expense.note || "",
    });
  }

  // Fonction pour vérifier si l'entrée peut être modifiée par le user
  function canEditEntry(entryUserId: string) {
    if (userRole === "ADMIN" || userRole === "MANAGER") return true;
    if (userRole === "WORKER" && entryUserId === userId) return true;
    return false;
  }

  if (loading) {
    return <div className="text-zinc-400">Chargement...</div>;
  }

  return (
    <Card>
      <div className="mb-4">
        <Label>Gestion des saisies</Label>
        {userRole === "WORKER" && (
          <div className="mt-1 text-xs text-zinc-400">
            ⚠️ En tant que WORKER, vous pouvez modifier vos entrées mais pas les supprimer.
          </div>
        )}
        {canEdit && (
          <div className="mt-1 text-xs text-zinc-400">
            ✅ En tant que {userRole}, vous avez tous les droits de gestion.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("HEURES")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "HEURES"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:bg-zinc-900"
          }`}
        >
          Heures ({timeEntries.length})
        </button>
        <button
          onClick={() => setActiveTab("DEPENSES")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "DEPENSES"
              ? "bg-zinc-800 text-white"
              : "text-zinc-400 hover:bg-zinc-900"
          }`}
        >
          Dépenses ({expenses.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === "HEURES" ? (
          timeEntries.length === 0 ? (
            <div className="text-sm text-zinc-400">Aucune entrée d'heures</div>
          ) : (
            timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                {editingTimeId === entry.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-400">Date</label>
                        <input
                          type="date"
                          value={editValues.date || ""}
                          onChange={(e) =>
                            setEditValues({ ...editValues, date: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400">Minutes</label>
                        <input
                          type="number"
                          value={editValues.minutes || ""}
                          onChange={(e) =>
                            setEditValues({ ...editValues, minutes: Number(e.target.value) })
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400">Tâche</label>
                      <input
                        type="text"
                        value={editValues.task || ""}
                        onChange={(e) =>
                          setEditValues({ ...editValues, task: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400">Note</label>
                      <textarea
                        value={editValues.note || ""}
                        onChange={(e) =>
                          setEditValues({ ...editValues, note: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveTimeEntry(entry.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-700"
                      >
                        Sauvegarder
                      </button>
                      <button
                        onClick={() => {
                          setEditingTimeId(null);
                          setEditValues({});
                        }}
                        className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-600"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-semibold">
                          {Math.floor(entry.minutes / 60)}h{" "}
                          {entry.minutes % 60 > 0 ? `${entry.minutes % 60}min` : ""}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {new Date(entry.date).toLocaleDateString("fr-FR")} •{" "}
                          {entry.user.name || entry.user.email}
                        </div>
                        {entry.task && (
                          <div className="mt-1 text-sm text-zinc-300">{entry.task}</div>
                        )}
                        {entry.note && (
                          <div className="mt-1 text-xs text-zinc-500">{entry.note}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {canEditEntry(entry.user.id) && (
                          <button
                            onClick={() => startEditTime(entry)}
                            className="rounded-lg bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700"
                          >
                            Modifier
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => deleteTimeEntry(entry.id)}
                            className="rounded-lg bg-red-900/30 px-3 py-1 text-xs text-red-300 hover:bg-red-900/50"
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )
        ) : expenses.length === 0 ? (
          <div className="text-sm text-zinc-400">Aucune dépense</div>
        ) : (
          expenses.map((expense) => (
            <div
              key={expense.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
            >
              {editingExpenseId === expense.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400">Date</label>
                      <input
                        type="date"
                        value={editValues.date || ""}
                        onChange={(e) =>
                          setEditValues({ ...editValues, date: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400">Montant (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editValues.amount || ""}
                        onChange={(e) =>
                          setEditValues({ ...editValues, amount: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-zinc-400">Catégorie</label>
                      <select
                        value={editValues.category || ""}
                        onChange={(e) =>
                          setEditValues({ ...editValues, category: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                      >
                        <option value="MATERIAL">Matériel</option>
                        <option value="RENTAL">Location</option>
                        <option value="TRAVEL">Déplacement</option>
                        <option value="SUBCONTRACT">Sous-traitance</option>
                        <option value="OTHER">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-400">Fournisseur</label>
                      <input
                        type="text"
                        value={editValues.vendor || ""}
                        onChange={(e) =>
                          setEditValues({ ...editValues, vendor: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Note</label>
                    <textarea
                      value={editValues.note || ""}
                      onChange={(e) =>
                        setEditValues({ ...editValues, note: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveExpense(expense.id)}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-700"
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => {
                        setEditingExpenseId(null);
                        setEditValues({});
                      }}
                      className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm font-medium hover:bg-zinc-600"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        {euros(expense.amountCents)}
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {new Date(expense.date).toLocaleDateString("fr-FR")} •{" "}
                        {expense.user.name || expense.user.email}
                      </div>
                      <div className="mt-1 text-xs">
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5">
                          {expense.category}
                        </span>
                      </div>
                      {expense.vendor && (
                        <div className="mt-1 text-sm text-zinc-300">{expense.vendor}</div>
                      )}
                      {expense.note && (
                        <div className="mt-1 text-xs text-zinc-500">{expense.note}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {canEditEntry(expense.user.id) && (
                        <button
                          onClick={() => startEditExpense(expense)}
                          className="rounded-lg bg-zinc-800 px-3 py-1 text-xs hover:bg-zinc-700"
                        >
                          Modifier
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="rounded-lg bg-red-900/30 px-3 py-1 text-xs text-red-300 hover:bg-red-900/50"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
