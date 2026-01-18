"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Btn, Card, H1, Label, euros } from "../_ui/ui";

type Role = "ADMIN" | "MANAGER" | "WORKER";

type ProjectRow = {
  id: string;
  name: string;
  clientName: string | null;
  revenueCents: number;
  totalCostsCents: number;
  marginCents: number;
  marginPct: number;
  lifecycle: "PLANNED" | "ACTIVE" | "DONE" | "ARCHIVED";
  status: "RENTABLE" | "A_RISQUE" | "NON_RENTABLE";
};

function pct(n: number) {
  if (!isFinite(n)) return "0%";
  return `${Math.round(n)}%`;
}

function fmtHours(min: number) {
  const h = min / 60;
  return `${Math.round(h * 10) / 10}h`;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function pieSlices(items: { label: string; value: number }[]) {
  const total = items.reduce((a, b) => a + (b.value > 0 ? b.value : 0), 0) || 1;
  let acc = 0;
  return items
    .filter((i) => i.value > 0)
    .map((i) => {
      const start = acc / total;
      acc += i.value;
      const end = acc / total;
      return { ...i, start, end, total };
    });
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function PieChart({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: number; sub?: string }[];
}) {
  const slices = pieSlices(items);
  const colors = ["#60a5fa", "#34d399", "#fbbf24", "#fb7185", "#a78bfa", "#22d3ee", "#f472b6"]; // ok (inline)
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
      <div className="text-sm text-zinc-400">{title}</div>
      <div className="mt-3 grid gap-4 md:grid-cols-[140px,1fr]">
        <svg width="140" height="140" viewBox="0 0 140 140" className="mx-auto">
          <circle cx="70" cy="70" r="62" fill="rgba(255,255,255,0.04)" />
          {slices.map((s, idx) => {
            const a0 = -Math.PI / 2 + s.start * Math.PI * 2;
            const a1 = -Math.PI / 2 + s.end * Math.PI * 2;
            return <path key={s.label} d={arcPath(70, 70, 62, a0, a1)} fill={colors[idx % colors.length]} opacity={0.85} />;
          })}
          <circle cx="70" cy="70" r="38" fill="#0b0f19" />
        </svg>

        <div className="space-y-2">
          {slices.length === 0 ? <div className="text-sm text-zinc-500">Aucune donnée.</div> : null}
          {slices.map((s, idx) => (
            <div key={s.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[idx % colors.length] }} />
                <div>
                  <div className="text-sm text-zinc-200">{s.label}</div>
                  {items.find((i) => i.label === s.label)?.sub ? (
                    <div className="text-xs text-zinc-500">{items.find((i) => i.label === s.label)?.sub}</div>
                  ) : null}
                </div>
              </div>
              <div className="text-sm text-zinc-300">{pct((s.value / s.total) * 100)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Bars({
  title,
  items,
  valueFmt,
}: {
  title: string;
  items: { label: string; value: number; hint?: string }[];
  valueFmt: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
  return (
    <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
      <div className="text-sm text-zinc-400">{title}</div>
      <div className="mt-3 space-y-2">
        {!items.length ? <div className="text-sm text-zinc-500">Aucune donnée.</div> : null}
        {items.map((i) => {
          const w = clamp01(Math.abs(i.value) / max) * 100;
          return (
            <div key={i.label} className="grid grid-cols-[1fr,110px] items-center gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-200">{i.label}</div>
                  {i.hint ? <div className="text-xs text-zinc-500">{i.hint}</div> : null}
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/5">
                  <div className="h-2 rounded-full bg-white/20" style={{ width: `${w}%` }} />
                </div>
              </div>
              <div className="text-right text-sm text-zinc-300">{valueFmt(i.value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const role: Role | null = me?.auth?.role ?? null;

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [adminCompanyId, setAdminCompanyId] = useState<string>("");
  const companyQs = useMemo(() => (role === "ADMIN" && adminCompanyId ? `?companyId=${adminCompanyId}` : ""), [role, adminCompanyId]);

  const [tab, setTab] = useState<"PROJECTS" | "STATS" | "COMPANY" | "BILLING" | "NOTIFS">("PROJECTS");

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const [companyData, setCompanyData] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);

  // Company UI state (MANAGER/ADMIN)
  const [taxRegime, setTaxRegime] = useState<string>("MICRO");
  const [vatEnabled, setVatEnabled] = useState<boolean>(false);
  const [vatRate, setVatRate] = useState<string>("0");
  const [urssafRate, setUrssafRate] = useState<string>("0");
  const [companySaveMsg, setCompanySaveMsg] = useState<string | null>(null);
  const [inviteWorkerEmail, setInviteWorkerEmail] = useState<string>("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  const [notifs, setNotifs] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  type TodoItem = { title: string; detail: string; onClick: () => void };
  const todos = useMemo<TodoItem[]>(() => {
    const items: TodoItem[] = [];

    const atRisk = projects
      .filter((p) => typeof (p as any).marginPct === "number" && (p as any).marginPct < 15)
      .sort((a, b) => ((a as any).marginPct ?? 0) - ((b as any).marginPct ?? 0));
    if (atRisk.length) {
      const p: any = atRisk[0];
      items.push({
        title: "Projet à risque",
        detail: `${p.name} — ${(p.marginPct ?? 0).toFixed(1)}% de marge`,
        onClick: () => router.push(`/projects/${p.id}`),
      });
    }

    const noRevenue = projects.filter((p: any) => (p.revenueCents ?? 0) <= 0);
    if (noRevenue.length) {
      const p: any = noRevenue[0];
      items.push({
        title: "Renseigner un montant",
        detail: `${p.name} — ajoute au moins une estimation pour mesurer la rentabilité`,
        onClick: () => router.push(`/projects/${p.id}`),
      });
    }

    const unread = (notifs?.items || []).filter((n: any) => !n.readAt);
    if (unread.length) {
      items.push({
        title: `Notifications (${unread.length})`,
        detail: "Voir les dernières actions/alertes",
        onClick: () => setTab("NOTIFS"),
      });
    }

    items.push({
      title: "Créer un devis",
      detail: "Prépare un devis / facture rapidement",
      onClick: () => setTab("BILLING"),
    });

    return items.slice(0, 5);
  }, [projects, notifs, router]);

  const [unread, setUnread] = useState<number>(0);

  // Load identity + admin companies
  useEffect(() => {
    (async () => {
      const rMe = await fetch("/api/me", { credentials: "include", cache: "no-store" as any }).catch(() => null);
      const jMe = await rMe?.json().catch(() => null);
      if (rMe && rMe.ok) {
        setMe(jMe);
        if (jMe?.auth?.role === "ADMIN") {
          const rC = await fetch("/api/admin/companies", { credentials: "include", cache: "no-store" as any }).catch(() => null);
          const jC = await rC?.json().catch(() => null);
          if (rC && rC.ok) {
            setCompanies(jC.companies || []);
            setAdminCompanyId(jC.companies?.[0]?.id || "");
          }
        }
      }

      const rU = await fetch("/api/notifications/unread", { credentials: "include", cache: "no-store" as any }).catch(() => null);
      const jU = await rU?.json().catch(() => null);
      if (rU && rU.ok) setUnread(jU.count || 0);
    })();
  }, []);

  // Load Projects (default tab)
  useEffect(() => {
    if (tab !== "PROJECTS") return;
    (async () => {
      const r = await fetch(`/api/dashboard${companyQs}`, { credentials: "include", cache: "no-store" as any }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (r && r.ok) {
        setProjects(j?.projects ?? []);
        setKpis(j?.kpis ?? null);
      }
    })();
  }, [tab, companyQs]);

  // Load Stats
  useEffect(() => {
    if (tab !== "STATS") return;
    (async () => {
      const r = await fetch(`/api/stats${companyQs}`, { credentials: "include", cache: "no-store" as any }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (r && r.ok) setStats(j);
    })();
  }, [tab, companyQs]);

  // Load Company
  useEffect(() => {
    if (tab !== "COMPANY") return;
    (async () => {
      const r = await fetch("/api/company", { credentials: "include", cache: "no-store" as any }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (r && r.ok) setCompanyData(j);

      const rT = await fetch(`/api/company/team${companyQs}`, { credentials: "include", cache: "no-store" as any }).catch(() => null);
      const jT = await rT?.json().catch(() => null);
      if (rT && rT.ok) setTeam(jT);
    })();
  }, [tab, companyQs]);

  // Hydrate settings UI when company data arrives
  useEffect(() => {
    const s = companyData?.settings;
    if (!s) return;
    setTaxRegime(String(s.taxRegime || "MICRO"));
    setVatEnabled(Boolean(s.vatEnabled));
    setVatRate(String(((s.vatRateBps || 0) / 100).toFixed(2)));
    setUrssafRate(String(((s.urssafRateBps || 0) / 100).toFixed(2)));
  }, [companyData]);

  // Load Billing
  useEffect(() => {
    if (tab !== "BILLING") return;
    (async () => {
      const rC = await fetch(`/api/clients${companyQs}`, { credentials: "include", cache: "no-store" as any }).catch(() => null);
      const jC = await rC?.json().catch(() => null);
      const rQ = await fetch(`/api/quotes${companyQs}`, { credentials: "include", cache: "no-store" as any }).catch(() => null);
      const jQ = await rQ?.json().catch(() => null);
      const rI = await fetch(`/api/invoices${companyQs}`, { credentials: "include", cache: "no-store" as any }).catch(() => null);
      const jI = await rI?.json().catch(() => null);
      setBilling({ clients: jC?.clients || [], quotes: jQ?.items || [], invoices: jI?.items || [] });
    })();
  }, [tab, companyQs]);

  // Load Notifications
  useEffect(() => {
    if (tab !== "NOTIFS") return;
    (async () => {
      const r = await fetch("/api/notifications", { credentials: "include", cache: "no-store" as any }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (r && r.ok) {
        setNotifs(j);
        setUnread(j.unread || 0);
      }
    })();
  }, [tab, companyQs]);

  async function markAllRead() {
    const ids: string[] = (notifs?.items || []).filter((n: any) => !n.readAt).map((n: any) => n.id);
    if (!ids.length) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    }).catch(() => null);
    setUnread(0);
    setNotifs((prev: any) => ({
      ...prev,
      items: (prev?.items || []).map((n: any) => ({ ...n, readAt: n.readAt || new Date().toISOString() })),
      unread: 0,
    }));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <H1>Dashboard</H1>
          <div className="text-sm text-zinc-400">Rentabilité, délégation, pilotage.</div>
        </div>

        <div className="flex items-center gap-2">
          {role === "ADMIN" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Entreprise</span>
              <select
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                value={adminCompanyId}
                onChange={(e) => setAdminCompanyId(e.target.value)}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="relative rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            onClick={() => setTab("NOTIFS")}
            title="Notifications"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs">
                {unread}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Btn onClick={() => setTab("PROJECTS")} variant={tab === "PROJECTS" ? "primary" : "ghost"}>Mes projets</Btn>
        <Btn onClick={() => setTab("STATS")} variant={tab === "STATS" ? "primary" : "ghost"}>Statistiques</Btn>
        {role !== "WORKER" && (
          <Btn onClick={() => setTab("COMPANY")} variant={tab === "COMPANY" ? "primary" : "ghost"}>Mon entreprise</Btn>
        )}
        {role !== "WORKER" && (
          <Btn onClick={() => setTab("BILLING")} variant={tab === "BILLING" ? "primary" : "ghost"}>Devis & factures</Btn>
        )}
      </div>

      {tab === "PROJECTS" && (
        <div className="space-y-3">
          {kpis && (
            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <div className="text-sm text-zinc-400">Revenus (mois)</div>
                <div className="text-xl font-semibold">{euros(kpis.caMonthCents || 0)}</div>
              </Card>
              <Card>
                <div className="text-sm text-zinc-400">Ce que tu gardes (mois)</div>
                <div className="text-xl font-semibold">{euros(kpis.marginMonthCents || 0)}</div>
              </Card>
              <Card>
                <div className="text-sm text-zinc-400">Projets à risque</div>
                <div className="text-xl font-semibold">{kpis.atRiskCount || 0}</div>
              </Card>
            </div>
          )}
          {todos.length ? (
            <Card>
              <div className="text-sm text-zinc-400">À faire maintenant</div>
              <div className="mt-3 space-y-2">
                {todos.map((t) => (
                  <button
                    key={t.title}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3 text-left hover:border-zinc-700"
                    onClick={t.onClick}
                  >
                    <div className="text-sm font-semibold text-zinc-100">{t.title}</div>
                    <div className="text-xs text-zinc-400">{t.detail}</div>
                  </button>
                ))}
              </div>
            </Card>
          ) : null}


          <Card>
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-400">Projets</div>
              <div className="text-xs text-zinc-500">WORKER = projets assignés uniquement</div>
            </div>

            <div className="mt-3 space-y-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 hover:border-zinc-700"
                  onClick={() => router.push(`/projects/${p.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") router.push(`/projects/${p.id}`);
                  }}
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-zinc-500">{p.clientName || "—"}</div>
                  </div>
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <Btn variant="ghost" onClick={() => router.push(`/projects/${p.id}`)}>
                      Ouvrir
                    </Btn>
                    <div className="text-right">
                    <div className="text-sm">{euros(p.marginCents || 0)} <span className="text-zinc-500">({(p.marginPct || 0).toFixed(1)}%)</span></div>
                    <div className="mt-1">
                      <span
  className={[
    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
    p.status === "RENTABLE"
      ? "bg-emerald-950/20 text-emerald-300 border-emerald-900/40"
      : p.status === "A_RISQUE"
        ? "bg-amber-950/20 text-amber-300 border-amber-900/40"
        : "bg-rose-950/20 text-rose-300 border-rose-900/40",
  ].join(" ")}
>
  {p.status === "RENTABLE" ? "Rentable" : p.status === "A_RISQUE" ? "À risque" : "Non rentable"}
</span>
                    </div>
                    </div>
                  </div>
                </div>
              ))}
              {!projects.length && <div className="text-sm text-zinc-500">Aucun projet.</div>}
            </div>
          </Card>
        </div>
      )}

      {tab === "STATS" && (
        <div className="space-y-3">
          <div className="text-sm text-zinc-400">Pilotage</div>
          <div className="text-sm text-zinc-500">Synthèse entreprise (heures, coûts, marge). Objectif : décider vite.</div>

          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <div className="text-sm text-zinc-400">Revenus (total)</div>
              <div className="text-xl font-semibold">{euros(stats?.totals?.revenueCents || 0)}</div>
            </Card>
            <Card>
              <div className="text-sm text-zinc-400">Coûts (total)</div>
              <div className="text-xl font-semibold">{euros(stats?.totals?.totalCostsCents || 0)}</div>
            </Card>
            <Card>
              <div className="text-sm text-zinc-400">Marge (total)</div>
              <div className="text-xl font-semibold">{euros(stats?.totals?.marginCents || 0)}</div>
            </Card>
            <Card>
              <div className="text-sm text-zinc-400">Heures (total)</div>
              <div className="text-xl font-semibold">{fmtHours(stats?.totals?.minutes || 0)}</div>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <PieChart
              title="Répartition du CA"
              items={(stats?.rows || []).map((r: any) => ({ label: r.name, value: r.revenueCents, sub: euros(r.revenueCents) }))}
            />
            <PieChart
              title="Répartition du temps"
              items={(stats?.rows || []).map((r: any) => ({ label: r.name, value: r.minutes, sub: fmtHours(r.minutes) }))}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Bars
              title="Marge par projet"
              items={(stats?.rows || []).map((r: any) => ({ label: r.name, value: r.marginCents, hint: `${(r.marginPct || 0).toFixed(1)}%` }))}
              valueFmt={(n) => euros(n)}
            />
            <Bars
              title="Heures par projet"
              items={(stats?.rows || []).map((r: any) => ({ label: r.name, value: r.minutes, hint: euros(r.revenueCents) }))}
              valueFmt={(n) => fmtHours(n)}
            />
          </div>
        </div>
      )}

      {tab === "COMPANY" && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-400">Mon entreprise</div>
              <div className="text-lg font-semibold">{companyData?.company?.name || "—"}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
              <div className="text-sm text-zinc-400">Paramètres (TVA / URSSAF)</div>

              <div className="mt-3 grid gap-3">
                <div className="grid grid-cols-[1fr,180px] items-center gap-3">
                  <Label>Régime</Label>
                  <select
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                    value={taxRegime}
                    onChange={(e) => setTaxRegime(e.target.value)}
                  >
                    <option value="MICRO">Micro</option>
                    <option value="SAS">SAS / SASU</option>
                    <option value="SARL">SARL / EURL</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>

                <div className="grid grid-cols-[1fr,180px] items-center gap-3">
                  <Label>TVA active</Label>
                  <label className="flex items-center justify-end gap-2 text-sm">
                    <input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)} />
                    <span>{vatEnabled ? "Oui" : "Non"}</span>
                  </label>
                </div>

                <div className="grid grid-cols-[1fr,180px] items-center gap-3">
                  <Label>Taux TVA (%)</Label>
                  <input
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                    value={vatRate}
                    onChange={(e) => setVatRate(e.target.value)}
                    inputMode="decimal"
                  />
                </div>

                <div className="grid grid-cols-[1fr,180px] items-center gap-3">
                  <Label>Taux URSSAF (%)</Label>
                  <input
                    className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                    value={urssafRate}
                    onChange={(e) => setUrssafRate(e.target.value)}
                    inputMode="decimal"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-500">(Estimation uniquement — pas un conseil comptable)</div>
                  <Btn
                    onClick={async () => {
                      setCompanySaveMsg(null);
                      const vatRateBps = Math.round(parseFloat(vatRate || "0") * 100);
                      const urssafRateBps = Math.round(parseFloat(urssafRate || "0") * 100);
                      const r = await fetch("/api/company/settings", {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ taxRegime, vatEnabled, vatRateBps, urssafRateBps }),
                      }).catch(() => null);
                      const j = await r?.json().catch(() => null);
                      if (!r || !r.ok) {
                        setCompanySaveMsg(j?.error || "SAVE_FAILED");
                        return;
                      }
                      setCompanySaveMsg("Enregistré ✅");
                      // refresh data
                      const r2 = await fetch("/api/company", { credentials: "include", cache: "no-store" as any }).catch(() => null);
                      const j2 = await r2?.json().catch(() => null);
                      if (r2 && r2.ok) setCompanyData(j2);
                    }}
                  >
                    Sauvegarder
                  </Btn>
                </div>

                {companySaveMsg ? <div className="text-xs text-zinc-400">{companySaveMsg}</div> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
              <div className="text-sm text-zinc-400">Membres & délégation</div>

              <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="text-xs text-zinc-500">Inviter un WORKER (rattaché à ton entreprise)</div>
                <div className="mt-2 flex gap-2">
                  <input
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                    placeholder="email@exemple.com"
                    value={inviteWorkerEmail}
                    onChange={(e) => setInviteWorkerEmail(e.target.value)}
                  />
                  <Btn
                    onClick={async () => {
                      setInviteMsg(null);
                      const r = await fetch("/api/invites", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email: inviteWorkerEmail, role: "WORKER" }),
                      }).catch(() => null);
                      const j = await r?.json().catch(() => null);
                      if (!r || !r.ok) {
                        setInviteMsg(j?.error || "INVITE_FAILED");
                        return;
                      }
                      if (j?.emailSent) setInviteMsg("Invitation envoyée ✅");
                      else if (j?.inviteUrl) setInviteMsg(`SMTP non configuré — lien généré ✅ : ${j.inviteUrl}`);
                      else setInviteMsg("Invitation générée ✅");
                      setInviteWorkerEmail("");
                    }}
                  >
                    Inviter
                  </Btn>
                </div>
                {inviteMsg ? <div className="mt-2 text-xs text-zinc-400">{inviteMsg}</div> : null}
              </div>

              <div className="mt-4 text-xs text-zinc-500">Assignations (le WORKER verra uniquement ses projets)</div>
              <div className="mt-2 space-y-3">
                {(companyData?.members || [])
                  .filter((m: any) => m.role === "WORKER")
                  .map((m: any) => {
                    const pm: any[] = companyData?.projectMembers || [];
                    const assigned = new Set(pm.filter((x) => x.userId === m.user?.id).map((x) => x.projectId));
                    const projectsList: any[] = companyData?.projects || [];

                    return (
                      <div key={m.id} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">{m.user?.email}</div>
                            <div className="text-xs text-zinc-500">WORKER {m.managerUserId ? "(rattaché)" : ""}</div>
                          </div>
                        </div>

                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          {projectsList.length ? (
                            projectsList.map((p: any) => (
                              <label key={p.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  defaultChecked={assigned.has(p.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) assigned.add(p.id);
                                    else assigned.delete(p.id);
                                  }}
                                />
                                <span className="text-zinc-200">{p.name}</span>
                              </label>
                            ))
                          ) : (
                            <div className="text-sm text-zinc-500">Crée d’abord un projet pour assigner ce WORKER.</div>
                          )}
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Btn
                            variant="ghost"
                            onClick={async () => {
                              const projectIds = Array.from(assigned);
                              const r = await fetch("/api/company/assignments", {
                                method: "POST",
                                credentials: "include",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId: m.user?.id, projectIds }),
                              }).catch(() => null);
                              const j = await r?.json().catch(() => null);
                              if (!r || !r.ok) {
                                alert(j?.error || "ASSIGN_FAILED");
                                return;
                              }
                              // refresh
                              const r2 = await fetch("/api/company", { credentials: "include", cache: "no-store" as any }).catch(() => null);
                              const j2 = await r2?.json().catch(() => null);
                              if (r2 && r2.ok) setCompanyData(j2);
                            }}
                          >
                            Sauvegarder les assignations
                          </Btn>
                        </div>
                      </div>
                    );
                  })}

                {!((companyData?.members || []).some((m: any) => m.role === "WORKER")) ? (
                  <div className="text-sm text-zinc-500">Aucun WORKER pour le moment.</div>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === "BILLING" && (
        <Card>
          <div className="text-sm text-zinc-400">Devis & factures (Bêta)</div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
              <div className="text-sm text-zinc-400">Clients</div>
              <div className="mt-1 text-xs text-zinc-500">{billing?.clients?.length || 0} client(s)</div>

              <div className="mt-3 flex gap-2">
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="Nom du client"
                  value={billing?.newClientName || ""}
                  onChange={(e) => setBilling((b: any) => ({ ...(b || {}), newClientName: e.target.value }))}
                />
                <Btn
                  onClick={async () => {
                    const name = String(billing?.newClientName || "").trim();
                    if (!name) return;
                    const r = await fetch("/api/clients", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name }),
                    }).catch(() => null);
                    const j = await r?.json().catch(() => null);
                    if (!r || !r.ok) {
                      alert(j?.error || "CREATE_CLIENT_FAILED");
                      return;
                    }
                    setBilling((b: any) => ({ ...(b || {}), clients: [j.client, ...((b || {}).clients || [])], newClientName: "" }));
                  }}
                >
                  +
                </Btn>
              </div>

              <div className="mt-3 space-y-2">
                {(billing?.clients || []).slice(0, 5).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                    <div className="text-sm text-zinc-200">{c.name}</div>
                    <div className="text-xs text-zinc-500">{c.email || ""}</div>
                  </div>
                ))}
                {(billing?.clients || []).length > 5 ? <div className="text-xs text-zinc-500">…</div> : null}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
              <div className="text-sm text-zinc-400">Devis</div>
              <div className="mt-1 text-xs text-zinc-500">{billing?.quotes?.length || 0} devis</div>

              <div className="mt-3 grid gap-2">
                <select
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  value={billing?.quoteClientId || ""}
                  onChange={(e) => setBilling((b: any) => ({ ...(b || {}), quoteClientId: e.target.value }))}
                >
                  <option value="">Client…</option>
                  {(billing?.clients || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  value={billing?.quoteProjectId || ""}
                  onChange={(e) => setBilling((b: any) => ({ ...(b || {}), quoteProjectId: e.target.value }))}
                >
                  <option value="">Projet (optionnel)…</option>
                  {(projects || []).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="Libellé (ex: Chantier électricité)"
                  value={billing?.quoteLabel || ""}
                  onChange={(e) => setBilling((b: any) => ({ ...(b || {}), quoteLabel: e.target.value }))}
                />
                <input
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="Montant HT (€)"
                  inputMode="decimal"
                  value={billing?.quoteAmount || ""}
                  onChange={(e) => setBilling((b: any) => ({ ...(b || {}), quoteAmount: e.target.value }))}
                />
                <Btn
                  onClick={async () => {
                    const clientId = billing?.quoteClientId || null;
                    const projectId = billing?.quoteProjectId || null;
                    const label = String(billing?.quoteLabel || "").trim();
                    const amount = parseFloat(String(billing?.quoteAmount || "0"));
                    if (!clientId || !label || !isFinite(amount)) return;

                    const subtotalCents = Math.round(amount * 100);
                    const vatRateBps = companyData?.settings?.vatEnabled ? (companyData?.settings?.vatRateBps || 0) : 0;
                    const vatCents = Math.round((subtotalCents * vatRateBps) / 10000);
                    const totalCents = subtotalCents + vatCents;
                    const r = await fetch("/api/quotes", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clientId, projectId, lines: [{ label, qty: 1, unitCents: subtotalCents }], subtotalCents, vatCents, totalCents }),
                    }).catch(() => null);
                    const j = await r?.json().catch(() => null);
                    if (!r || !r.ok) {
                      alert(j?.error || "CREATE_QUOTE_FAILED");
                      return;
                    }
                    setBilling((b: any) => ({ ...(b || {}), quotes: [j.item, ...((b || {}).quotes || [])], quoteClientId: "", quoteProjectId: "", quoteLabel: "", quoteAmount: "" }));
                  }}
                >
                  Créer un devis
                </Btn>
              </div>

              <div className="mt-3 space-y-2">
                {(billing?.quotes || []).slice(0, 5).map((q: any) => (
                  <div key={q.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                    <div>
                      <div className="text-sm text-zinc-200">{q.number}</div>
                      <div className="text-xs text-zinc-500">{q.client?.name || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-zinc-300">{euros(q.totalCents || 0)}</div>
                      <Btn variant="ghost" onClick={() => window.open(`/print/quote/${q.id}`, "_blank")}>PDF</Btn>
                      <Btn
                        variant="ghost"
                        onClick={async () => {
                          const r = await fetch("/api/invoices", {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ quoteId: q.id }),
                          }).catch(() => null);
                          const j = await r?.json().catch(() => null);
                          if (!r || !r.ok) {
                            alert(j?.error || "CREATE_INVOICE_FAILED");
                            return;
                          }
                          setBilling((b: any) => ({ ...(b || {}), invoices: [j.item, ...((b || {}).invoices || [])] }));
                        }}
                      >
                        → Facture
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/50 p-4">
              <div className="text-sm text-zinc-400">Factures</div>
              <div className="mt-1 text-xs text-zinc-500">{billing?.invoices?.length || 0} facture(s)</div>

              <div className="mt-3 grid gap-2">
                <select
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  value={billing?.invoiceClientId || ""}
                  onChange={(e) => setBilling((b: any) => ({ ...(b || {}), invoiceClientId: e.target.value }))}
                >
                  <option value="">Client…</option>
                  {(billing?.clients || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="Libellé"
                  value={billing?.invoiceLabel || ""}
                  onChange={(e) => setBilling((b: any) => ({ ...(b || {}), invoiceLabel: e.target.value }))}
                />
                <input
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="Montant HT (€)"
                  inputMode="decimal"
                  value={billing?.invoiceAmount || ""}
                  onChange={(e) => setBilling((b: any) => ({ ...(b || {}), invoiceAmount: e.target.value }))}
                />
                <Btn
                  onClick={async () => {
                    const clientId = billing?.invoiceClientId || null;
                    const label = String(billing?.invoiceLabel || "").trim();
                    const amount = parseFloat(String(billing?.invoiceAmount || "0"));
                    if (!clientId || !label || !isFinite(amount)) return;

                    const subtotalCents = Math.round(amount * 100);
                    const vatRateBps = companyData?.settings?.vatEnabled ? (companyData?.settings?.vatRateBps || 0) : 0;
                    const vatCents = Math.round((subtotalCents * vatRateBps) / 10000);
                    const totalCents = subtotalCents + vatCents;
                    const r = await fetch("/api/invoices", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clientId, lines: [{ label, qty: 1, unitCents: subtotalCents }], subtotalCents, vatCents, totalCents }),
                    }).catch(() => null);
                    const j = await r?.json().catch(() => null);
                    if (!r || !r.ok) {
                      alert(j?.error || "CREATE_INVOICE_FAILED");
                      return;
                    }
                    setBilling((b: any) => ({ ...(b || {}), invoices: [j.item, ...((b || {}).invoices || [])], invoiceClientId: "", invoiceLabel: "", invoiceAmount: "" }));
                  }}
                >
                  Créer une facture
                </Btn>
              </div>

              <div className="mt-3 space-y-2">
                {(billing?.invoices || []).slice(0, 5).map((it: any) => (
                  <div key={it.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
                    <div>
                      <div className="text-sm text-zinc-200">{it.number}</div>
                      <div className="text-xs text-zinc-500">{it.client?.name || "—"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-zinc-300">{euros(it.totalCents || 0)}</div>
                      <Btn variant="ghost" onClick={() => window.open(`/print/invoice/${it.id}`, "_blank")}>PDF</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-zinc-500">Astuce: relie un devis à un projet pour garder une trace commerciale et comparer prévu vs réel.</div>
        </Card>
      )}

      {tab === "NOTIFS" && (
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">Notifications</div>
            <Btn onClick={markAllRead} variant="ghost">Tout marquer comme lu</Btn>
          </div>

          <div className="mt-3 space-y-2">
            {(notifs?.items || []).map((n: any) => (
              <div key={n.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{n.title}</div>
                  {!n.readAt && <span className="text-xs text-red-400">Nouveau</span>}
                </div>
                {n.body && <div className="mt-1 text-sm text-zinc-400">{n.body}</div>}
                <div className="mt-1 text-xs text-zinc-600">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
            {!notifs?.items?.length && <div className="text-sm text-zinc-500">Aucune notification.</div>}
          </div>
        </Card>
      )}
    </div>
  );
}