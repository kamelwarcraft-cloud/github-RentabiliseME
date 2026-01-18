"use client";

import { useEffect, useState } from "react";
import { Btn, Card, H1, Label } from "@/app/_ui/ui";

type WaitlistItem = {
  id: string;
  email: string;
  source: string | null;
  status: "PENDING" | "INVITED" | "APPROVED";
  note: string | null;
  createdAt: string;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  memberships: Array<{
    role: "ADMIN" | "MANAGER" | "WORKER";
    /** For WORKER accounts, the manager they are attached to within the same company. */
    managerUserId?: string | null;
    company: {
      name: string;
    };
  }>;
};

type Stats = {
  totalWaitlist: number;
  pending: number;
  invited: number;
  approved: number;
  totalUsers: number;
  admins: number;
  managers: number;
  workers: number;
};

function statusLabel(s: WaitlistItem["status"]) {
  if (s === "INVITED") return "Invité";
  if (s === "APPROVED") return "Activé";
  return "En attente";
}

function statusColor(s: WaitlistItem["status"]) {
  if (s === "APPROVED") return "text-emerald-400";
  if (s === "INVITED") return "text-blue-400";
  return "text-amber-400";
}

export default function AdminPanelPage() {
  const [activeTab, setActiveTab] = useState<"WAITLIST" | "USERS" | "STATS">("STATS");
  const [waitlistItems, setWaitlistItems] = useState<WaitlistItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MANAGER" | "WORKER">("MANAGER");
  const [expandedManagers, setExpandedManagers] = useState<Record<string, boolean>>({});

  async function loadWaitlist() {
    const r = await fetch("/api/admin/waitlist", { credentials: "include" });
    const j = await r.json().catch(() => null);
    if (r.ok) {
      setWaitlistItems(j.items ?? []);
    }
  }

  async function loadUsers() {
    const r = await fetch("/api/admin/users", { credentials: "include" });
    const j = await r.json().catch(() => null);
    if (r.ok) {
      setUsers(j.users ?? []);
    }
  }

  async function loadStats() {
    setLoading(true);
    setErr(null);
    try {
      await Promise.all([loadWaitlist(), loadUsers()]);
    } catch (error) {
      setErr("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (waitlistItems.length > 0 || users.length > 0) {
      const totalWaitlist = waitlistItems.length;
      const pending = waitlistItems.filter(i => i.status === "PENDING").length;
      const invited = waitlistItems.filter(i => i.status === "INVITED").length;
      const approved = waitlistItems.filter(i => i.status === "APPROVED").length;
      
      const totalUsers = users.length;
      const admins = users.filter(u => u.memberships.some(m => m.role === "ADMIN")).length;
      const managers = users.filter(u => u.memberships.some(m => m.role === "MANAGER")).length;
      const workers = users.filter(u => u.memberships.some(m => m.role === "WORKER")).length;

      setStats({
        totalWaitlist,
        pending,
        invited,
        approved,
        totalUsers,
        admins,
        managers,
        workers,
      });
    }
  }, [waitlistItems, users]);

  async function generateInvite() {
    if (!inviteEmail) {
      alert("Veuillez saisir un email");
      return;
    }

    setInviteLink(null);
    const r = await fetch("/api/admin/invite-link", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      setErr(j?.error ?? `Erreur (${r.status})`);
      return;
    }
    setInviteLink(j.link);
    setInviteEmail("");
  }

  async function inviteFromWaitlist(email: string, waitlistId: string) {
    setInviteLink(null);
    const r = await fetch("/api/admin/invite-link", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: "MANAGER" }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      setErr(j?.error ?? `Erreur (${r.status})`);
      return;
    }
    setInviteLink(j.link);

    // Marquer comme invité
    await fetch(`/api/admin/waitlist`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: waitlistId, status: "INVITED" }),
    }).catch(() => null);
    
    loadWaitlist();
  }

  async function deleteWaitlistItem(id: string) {
    if (!confirm("Supprimer cette entrée ?")) return;

    const r = await fetch("/api/admin/waitlist", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (r.ok) {
      loadWaitlist();
    } else {
      alert("Erreur lors de la suppression");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <H1>Panel Admin - Bêta</H1>
          <div className="mt-1 text-sm text-zinc-400">
            Gérez les inscriptions, générez des invitations et suivez vos utilisateurs
          </div>
        </div>
        <Btn href="/dashboard" variant="secondary">
          Retour dashboard
        </Btn>
      </div>

      {err && (
        <Card>
          <div className="text-sm text-red-200">{err}</div>
        </Card>
      )}

      {inviteLink && (
        <Card>
          <Label>🎉 Lien d'invitation généré</Label>
          <div className="mt-2 break-all rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100">
            {inviteLink}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-800"
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                alert("Lien copié !");
              }}
            >
              Copier
            </button>
            <button
              className="rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
              onClick={() => setInviteLink(null)}
            >
              Fermer
            </button>
          </div>
        </Card>
      )}

      {/* Statistiques */}
      {stats && activeTab === "STATS" && (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <div className="text-xs text-zinc-400">Total Waitlist</div>
              <div className="mt-1 text-3xl font-bold">{stats.totalWaitlist}</div>
              <div className="mt-2 space-y-1 text-xs text-zinc-500">
                <div>En attente: {stats.pending}</div>
                <div>Invités: {stats.invited}</div>
                <div>Activés: {stats.approved}</div>
              </div>
            </Card>

            <Card>
              <div className="text-xs text-zinc-400">Utilisateurs actifs</div>
              <div className="mt-1 text-3xl font-bold text-emerald-400">{stats.totalUsers}</div>
            </Card>

            <Card>
              <div className="text-xs text-zinc-400">Managers & Admins</div>
              <div className="mt-1 text-3xl font-bold text-blue-400">
                {stats.admins + stats.managers}
              </div>
              <div className="mt-2 space-y-1 text-xs text-zinc-500">
                <div>Admins: {stats.admins}</div>
                <div>Managers: {stats.managers}</div>
              </div>
            </Card>

            <Card>
              <div className="text-xs text-zinc-400">Workers</div>
              <div className="mt-1 text-3xl font-bold text-amber-400">{stats.workers}</div>
            </Card>
          </div>

          {/* Graphique simple */}
          <Card>
            <Label>Répartition des utilisateurs</Label>
            <div className="mt-4 flex gap-2">
              <div 
                className="h-8 rounded bg-emerald-500" 
                style={{ width: `${(stats.admins / stats.totalUsers) * 100}%`, minWidth: '40px' }}
                title={`Admins: ${stats.admins}`}
              />
              <div 
                className="h-8 rounded bg-blue-500" 
                style={{ width: `${(stats.managers / stats.totalUsers) * 100}%`, minWidth: '40px' }}
                title={`Managers: ${stats.managers}`}
              />
              <div 
                className="h-8 rounded bg-amber-500" 
                style={{ width: `${(stats.workers / stats.totalUsers) * 100}%`, minWidth: '80px' }}
                title={`Workers: ${stats.workers}`}
              />
            </div>
            <div className="mt-2 flex gap-4 text-xs text-zinc-400">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-emerald-500" />
                Admins ({stats.admins})
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-blue-500" />
                Managers ({stats.managers})
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-amber-500" />
                Workers ({stats.workers})
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("STATS")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "STATS"
              ? "border-b-2 border-blue-500 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          📊 Statistiques
        </button>
        <button
          onClick={() => setActiveTab("WAITLIST")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "WAITLIST"
              ? "border-b-2 border-blue-500 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          📝 Waitlist ({stats?.totalWaitlist || 0})
        </button>
        <button
          onClick={() => setActiveTab("USERS")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "USERS"
              ? "border-b-2 border-blue-500 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          👥 Utilisateurs ({stats?.totalUsers || 0})
        </button>
      </div>

      {/* Contenu Waitlist */}
      {activeTab === "WAITLIST" && (
        <>
          {/* Génération manuelle d'invitation */}
          <Card>
            <Label>Générer une invitation manuelle</Label>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm"
              >
                <option value="WORKER">Worker</option>
                <option value="MANAGER">Manager</option>
              </select>
              <button
                onClick={generateInvite}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-700"
              >
                Générer lien
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <Label>Demandes d'inscription</Label>
                <div className="mt-1 text-sm text-zinc-300">
                  {loading ? "Chargement…" : `${waitlistItems.length} entrées`}
                </div>
              </div>
              <button
                className="rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
                onClick={loadWaitlist}
              >
                🔄 Rafraîchir
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-zinc-400">
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Source</th>
                    <th className="py-2 pr-4">Statut</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlistItems.map((item) => (
                    <tr key={item.id} className="border-t border-zinc-800">
                      <td className="py-3 pr-4 text-zinc-200">{item.email}</td>
                      <td className="py-3 pr-4 text-zinc-400">{item.source ?? "-"}</td>
                      <td className="py-3 pr-4">
                        <span className={statusColor(item.status)}>{statusLabel(item.status)}</span>
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">
                        {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <button
                            className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium hover:bg-blue-700"
                            onClick={() => inviteFromWaitlist(item.email, item.id)}
                          >
                            Inviter
                          </button>
                          <button
                            className="rounded-lg bg-red-900/30 px-3 py-1 text-xs text-red-300 hover:bg-red-900/50"
                            onClick={() => deleteWaitlistItem(item.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && waitlistItems.length === 0 && (
                    <tr>
                      <td className="py-6 text-center text-zinc-400" colSpan={5}>
                        Aucune demande pour le moment
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Contenu Utilisateurs */}
      {activeTab === "USERS" && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <Label>Utilisateurs actifs</Label>
              <div className="mt-1 text-sm text-zinc-300">
                {loading ? "Chargement…" : `${users.length} utilisateurs`}
              </div>
            </div>
            <button
              className="rounded-xl px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900"
              onClick={loadUsers}
            >
              🔄 Rafraîchir
            </button>
          </div>

          {/* Vue hiérarchique */}
          <div className="mt-4 space-y-3">
            {(() => {
              const getRole = (u: User) => u.memberships[0]?.role;
              const companyName = (u: User) => u.memberships[0]?.company.name || "-";
              const admins = users.filter(u => getRole(u) === "ADMIN");
              const managers = users.filter(u => getRole(u) === "MANAGER");
              const workers = users.filter(u => getRole(u) === "WORKER");

              const workersByManager: Record<string, User[]> = {};
              for (const w of workers) {
                const managerId = w.memberships[0]?.managerUserId;
                if (!managerId) continue;
                (workersByManager[managerId] ||= []).push(w);
              }

              return (
                <>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <div className="text-sm font-semibold text-zinc-200">ADMIN</div>
                    <div className="mt-3 space-y-2">
                      {admins.length ? admins.map((u) => (
                        <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2">
                          <div className="min-w-[220px]">
                            <div className="text-sm text-zinc-100">{u.email}</div>
                            <div className="text-xs text-zinc-400">{u.name || "-"} • {companyName(u)}</div>
                          </div>
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">ADMIN</span>
                        </div>
                      )) : <div className="text-sm text-zinc-400">Aucun admin</div>}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <div className="text-sm font-semibold text-zinc-200">MANAGER</div>
                    <div className="mt-3 space-y-2">
                      {managers.length ? managers.map((m) => {
                        const isOpen = Boolean(expandedManagers[m.id]);
                        const ws = workersByManager[m.id] || [];
                        return (
                          <div key={m.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30">
                            <div className="flex items-center justify-between gap-2 px-3 py-2">
                              <div>
                                <div className="text-sm text-zinc-100">{m.email}</div>
                                <div className="text-xs text-zinc-400">{m.name || "-"} • {companyName(m)}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">MANAGER</span>
                                <button
                                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-900"
                                  onClick={() => setExpandedManagers((s) => ({ ...s, [m.id]: !isOpen }))}
                                >
                                  {isOpen ? "−" : "+"} ({ws.length})
                                </button>
                              </div>
                            </div>
                            {isOpen ? (
                              <div className="border-t border-zinc-800 px-3 py-2">
                                {ws.length ? (
                                  <div className="space-y-2">
                                    {ws.map((w) => (
                                      <div key={w.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2">
                                        <div>
                                          <div className="text-sm text-zinc-100">{w.email}</div>
                                          <div className="text-xs text-zinc-500">{w.name || "-"}</div>
                                        </div>
                                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">WORKER</span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-zinc-400">Aucun worker rattaché</div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      }) : <div className="text-sm text-zinc-400">Aucun manager</div>}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </Card>
      )}
    </div>
  );
}
