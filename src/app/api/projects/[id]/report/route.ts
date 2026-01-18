import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { computeProjectFinancials } from "@/lib/finance";
import fs from "node:fs";
import path from "node:path";

let logoDataUri: string | null = null;
function getLogoDataUri() {
  if (logoDataUri) return logoDataUri;
  try {
    // Logo public (utilisé aussi dans la navbar).
    const p = path.join(process.cwd(), "public", "logo.png");
    const buf = fs.readFileSync(p);
    logoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    logoDataUri = null;
  }
  return logoDataUri;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function euros(cents: number) {
  const v = (cents / 100).toFixed(2).replace(".", ",");
  return `${v} €`;
}
function hFromMinutes(min: number) {
  const h = Math.round((min / 60) * 10) / 10;
  return `${h} h`;
}
function statusLabel(s: string) {
  if (s === "A_RISQUE") return "À RISQUE";
  if (s === "NON_RENTABLE") return "NON RENTABLE";
  return "RENTABLE";
}
function statusColor(s: string) {
  if (s === "NON_RENTABLE") return "#ef4444"; // rouge
  if (s === "A_RISQUE") return "#f59e0b";     // orange
  return "#22c55e";                           // vert
}
function wowText(fin: any) {
  const s = fin.status;
  const m = fin.breakEvenRemainingMinutes ?? 0;
  if (s === "RENTABLE") {
    const gain = fin.marginCents ?? 0;
    const base = `Tu gagnes actuellement ${euros(gain)} sur ce projet.`;
    if (m > 0) return `${base} Il te reste environ ${Math.round(m / 60)}h avant d’être en perte.`;
    return base;
  }
  if (s === "A_RISQUE") {
    return "Attention, tu es proche de la perte. Tu arrives au seuil de rentabilité.";
  }
  // NON RENTABLE
  const loss = Math.abs(fin.marginCents ?? 0);
  const base = `Tu perds actuellement ${euros(loss)} sur ce projet.`;
  if (m < 0) return `${base} Tu as dépassé le seuil de rentabilité de ${Math.round(Math.abs(m) / 60)}h.`;
  return base;
}

function buildHtml(payload: {
  projectName: string;
  clientName: string | null;
  address: string | null;
  createdAt: string;
  fin: any;
  planned?: any;
  actual?: any;
  lastTime: Array<{ date: string; minutes: number; task: string | null; note: string | null }>;
  expByCat: Array<{ category: string; amountCents: number }>;
}) {
  const { projectName, clientName, address, createdAt, fin, lastTime, expByCat } = payload;
  const logo = getLogoDataUri();

  const col = statusColor(fin.status);
  const label = statusLabel(fin.status);
  const wow = wowText(fin);

  // tableaux
  const planned = fin.planned ?? null;
  const actual = fin.actual ?? null;

  const plannedHours = planned?.laborMinutes ?? 0;
  const actualHours = actual?.laborMinutes ?? 0;
  const plannedExp = (planned?.materialsCents ?? 0) + (planned?.subcontractCents ?? 0) + (planned?.otherCents ?? 0);
  const actualExp = (actual?.materialsCents ?? 0) + (actual?.subcontractCents ?? 0) + (actual?.otherCents ?? 0);

  const hoursPct = plannedHours > 0 ? Math.round((actualHours / plannedHours) * 100) : 0;
  const expPct = plannedExp > 0 ? Math.round((actualExp / plannedExp) * 100) : 0;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Rapport - ${projectName}</title>
<style>
  :root { --bg:#0b0f19; --card:#0f172a; --muted:#94a3b8; --text:#e2e8f0; --border:#1f2937; }
  * { box-sizing:border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#fff; color:#0f172a; }
  .page { padding:28px; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; }
  .brand { font-weight:800; letter-spacing:0.2px; font-size:18px; }
  .sub { color:#475569; font-size:12px; margin-top:4px; }
  .meta { text-align:right; font-size:12px; color:#475569; line-height:1.5; }
  .card { margin-top:18px; border:1px solid #e2e8f0; border-radius:14px; padding:16px; }
  .hero { border:2px solid ${col}; background: #f8fafc; }
  .badge { display:inline-block; padding:6px 10px; border-radius:999px; font-weight:700; font-size:12px; background:${col}; color:white; }
  .h1 { font-size:18px; font-weight:800; margin:0; }
  .wow { margin-top:10px; font-size:13px; color:#0f172a; }
  .kpis { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-top:14px;}
  .kpi { border:1px solid #e2e8f0; border-radius:12px; padding:10px; }
  .kpi .l { font-size:11px; color:#64748b; }
  .kpi .v { margin-top:6px; font-size:16px; font-weight:800; }
  table { width:100%; border-collapse:collapse; margin-top:10px; }
  th, td { border-bottom:1px solid #e2e8f0; padding:10px 6px; font-size:12px; text-align:left; }
  th { color:#475569; font-weight:700; }
  .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
  .muted { color:#64748b; }
  .small { font-size:11px; }
  .sign { margin-top:18px; display:flex; justify-content:flex-end; }
  .line { width:240px; border-bottom:1px solid #94a3b8; height:24px; }
  .footer { position:fixed; left:28px; right:28px; bottom:18px; text-align:center; font-size:10px; color:#64748b; }
  .brandRow { display:flex; align-items:center; gap:10px; }
  .brandLogo { width:140px; height:auto; }
</style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div class="brandRow">
        ${logo ? `<img class="brandLogo" src="${logo}" alt="Rentabilise.me" />` : `<div class="brand">Rentabilise.me</div>`}
      </div>
      <div class="meta">
        <div><b>Date</b> : ${createdAt}</div>
        <div><b>Projet</b> : ${projectName}</div>
        ${clientName ? `<div><b>Client</b> : ${clientName}</div>` : ``}
        ${address ? `<div><b>Adresse</b> : ${address}</div>` : ``}
      </div>
    </div>

    <div class="card hero">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
        <div>
          <div class="badge">${label}</div>
          <p class="wow">${wow}</p>
        </div>
        <div style="text-align:right;">
          <div class="small muted">Marge</div>
          <div style="font-weight:900; font-size:18px;">${euros(fin.marginCents)}</div>
          <div class="small muted">${fin.marginPct}%</div>
        </div>
      </div>

      <div class="kpis">
        <div class="kpi"><div class="l">Chiffre d’affaires</div><div class="v">${euros(fin.revenueCents)}</div></div>
        <div class="kpi"><div class="l">Coûts réels</div><div class="v">${euros(fin.actual.totalCostsCents)}</div></div>
        <div class="kpi"><div class="l">Heures réelles</div><div class="v">${hFromMinutes(fin.actual.laborMinutes)}</div></div>
      </div>
    </div>

    <div class="card">
      <div class="h1">Prévu vs Réel</div>
      <table>
        <thead>
          <tr><th></th><th>Prévu</th><th>Réel</th><th>Écart</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><b>Heures</b></td>
            <td>${hFromMinutes(plannedHours)}</td>
            <td>${hFromMinutes(actualHours)}</td>
            <td>${plannedHours ? `${hoursPct}%` : "—"}</td>
          </tr>
          <tr>
            <td><b>Dépenses</b></td>
            <td>${euros(plannedExp)}</td>
            <td>${euros(actualExp)}</td>
            <td>${plannedExp ? `${expPct}%` : "—"}</td>
          </tr>
          <tr>
            <td><b>Marge</b></td>
            <td>${euros(fin.revenueCents - plannedExp)}</td>
            <td>${euros(fin.marginCents)}</td>
            <td>${euros(fin.marginCents - (fin.revenueCents - plannedExp))}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="grid2">
      <div class="card">
        <div class="h1">Dernières heures</div>
        <table>
          <thead><tr><th>Date</th><th>Durée</th><th>Tâche</th></tr></thead>
          <tbody>
            ${lastTime.length ? lastTime.map(x => `
              <tr>
                <td class="muted">${x.date}</td>
                <td>${hFromMinutes(x.minutes)}</td>
                <td>${(x.task ?? "—")}</td>
              </tr>
            `).join("") : `<tr><td colspan="3" class="muted">Aucune saisie</td></tr>`}
          </tbody>
        </table>
      </div>

      <div class="card">
        <div class="h1">Dépenses par catégorie</div>
        <table>
          <thead><tr><th>Catégorie</th><th>Montant</th></tr></thead>
          <tbody>
            ${expByCat.length ? expByCat.map(x => `
              <tr>
                <td>${x.category}</td>
                <td>${euros(x.amountCents)}</td>
              </tr>
            `).join("") : `<tr><td colspan="2" class="muted">Aucune dépense</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div class="sign">
      <div>
        <div class="small muted">Signature / validation</div>
        <div class="line"></div>
      </div>
    </div>

    <div class="footer">Rentabilise.me – confidentiel</div>

  </div>
</body>
</html>`;
}

// Browser singleton (évite de relancer Chromium à chaque PDF)
let _browserPromise: Promise<any> | null = null;

async function getChromium() {
  const { chromium } = await import("playwright");
  return chromium;
}


async function getBrowser() {
  if (_browserPromise) return _browserPromise;
  _browserPromise = (async () => {
    const chromium = await getChromium();
    return chromium.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  })();
  return _browserPromise;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["ADMIN", "MANAGER", "WORKER"]);
  const { id } = await ctx.params;

  const project = await prisma.project.findFirst({
    where: { id, companyId: auth.companyId },
    include: { budget: true },
  });
  if (!project) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const company = await prisma.company.findUnique({
    where: { id: auth.companyId },
    select: { hourlyCostCents: true, overheadRateBps: true },
  });
  if (!company) return NextResponse.json({ error: "NO_COMPANY" }, { status: 403 });

  const [timeAgg, expAgg, lastTimeEntries] = await Promise.all([
    prisma.timeEntry.aggregate({
      where: { companyId: auth.companyId, projectId: project.id },
      _sum: { minutes: true },
    }),
    prisma.expense.groupBy({
      by: ["category"],
      where: { companyId: auth.companyId, projectId: project.id },
      _sum: { amountCents: true },
    }),
    prisma.timeEntry.findMany({
      where: { companyId: auth.companyId, projectId: project.id },
      orderBy: { date: "desc" },
      take: 6,
      select: { date: true, minutes: true, task: true, note: true },
    }),
  ]);

  const expensesByCat: Record<string, number> = {};
  for (const row of expAgg) expensesByCat[row.category] = row._sum.amountCents ?? 0;

  const financials = computeProjectFinancials({
    revenueCents: project.revenueCents,
    hourlyCostCents: company.hourlyCostCents,
    overheadRateBps: company.overheadRateBps,
    planned: project.budget
      ? {
          laborMinutes: project.budget.plannedLaborMinutes,
          materialsCents: project.budget.plannedMaterialsCents,
          subcontractCents: project.budget.plannedSubcontractCents,
          otherCents: project.budget.plannedOtherCents,
        }
      : undefined,
    actual: {
      laborMinutes: timeAgg._sum.minutes ?? 0,
      expensesByCatCents: expensesByCat,
    },
  });

  const html = buildHtml({
    projectName: project.name,
    clientName: project.clientName ?? null,
    address: project.address ?? null,
    createdAt: new Date().toLocaleDateString("fr-FR"),
    fin: financials,
    lastTime: lastTimeEntries.map(x => ({
      date: new Date(x.date).toLocaleDateString("fr-FR"),
      minutes: x.minutes,
      task: x.task,
      note: x.note,
    })),
    expByCat: Object.entries(expensesByCat).map(([category, amountCents]) => ({ category, amountCents })),
  });

  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
  });

  await page.close();

 // pdfBuffer peut être un Uint8Array selon versions
  const body = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);

  return new NextResponse(body, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="rapport-${project.id}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
