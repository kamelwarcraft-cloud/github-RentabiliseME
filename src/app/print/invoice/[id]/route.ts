import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let logoDataUri: string | null = null;

function getLogoDataUri() {
  if (logoDataUri) return logoDataUri;
  try {
    const p = path.join(process.cwd(), "public", "logo.png");
    const buf = fs.readFileSync(p);
    logoDataUri = `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    logoDataUri = null;
  }
  return logoDataUri;
}

function euros(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("fr-FR", { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

function buildInvoiceHtml(payload: {
  number: string;
  createdAt: Date;
  companyName: string;
  client: { name: string; email: string | null; phone: string | null; address: string | null } | null;
  project: { name: string } | null;
  lines: any[];
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  dueDate?: Date | null;
  status: string;
}) {
  const { number, createdAt, companyName, client, project, lines, subtotalCents, vatCents, totalCents, dueDate, status } = payload;
  const logo = getLogoDataUri();
  
  const isPaid = status === 'PAID';
  const isOverdue = status === 'OVERDUE';

  const linesHtml = lines.length ? lines.map(line => {
    const qty = line.quantity || 1;
    const unitPrice = line.unitPriceCents || line.unitPrice || 0;
    const total = line.totalCents || (qty * unitPrice);
    return `
      <tr>
        <td>${line.description || ''}</td>
        <td class="qty">${qty}</td>
        <td class="amount">${euros(unitPrice)}</td>
        <td class="amount">${euros(total)}</td>
      </tr>
    `;
  }).join('') : `
    <tr>
      <td colspan="4" style="text-align:center; color:#94a3b8;">Aucune ligne</td>
    </tr>
  `;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Facture ${number}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { 
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; 
    background:#fff; 
    color:#0f172a; 
    padding:28px;
  }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; }
  .logo { width:140px; height:auto; }
  .brand { font-weight:800; font-size:24px; color:#dc2626; }
  .doc-title { text-align:right; }
  .doc-title h1 { font-size:28px; font-weight:800; color:#dc2626; margin-bottom:8px; }
  .doc-title .number { font-size:14px; color:#64748b; }
  .doc-title .date { font-size:12px; color:#94a3b8; margin-top:4px; }
  .doc-title .status { 
    display:inline-block; 
    padding:4px 12px; 
    border-radius:20px; 
    font-size:11px; 
    font-weight:700; 
    margin-top:8px;
    ${isPaid ? 'background:#dcfce7; color:#166534;' : isOverdue ? 'background:#fef2f2; color:#dc2626;' : 'background:#fef3c7; color:#92400e;'}
  }
  
  .addresses { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:28px 0; padding:20px; background:#f8fafc; border-radius:12px; }
  .address-block h3 { font-size:11px; text-transform:uppercase; color:#64748b; margin-bottom:12px; letter-spacing:0.5px; }
  .address-block .name { font-size:16px; font-weight:700; margin-bottom:8px; }
  .address-block .details { font-size:13px; color:#475569; line-height:1.6; }
  
  .project-ref { padding:12px 16px; background:#dbeafe; border-left:3px solid #2563eb; margin:20px 0; font-size:13px; color:#1e40af; }
  .due-date { padding:12px 16px; background:#fef2f2; border-left:3px solid #dc2626; margin:20px 0; font-size:13px; color:#dc2626; font-weight:700; }
  
  .table-container { margin:28px 0; }
  table { width:100%; border-collapse:collapse; }
  thead { background:#f1f5f9; }
  th { padding:12px; text-align:left; font-size:12px; font-weight:700; color:#475569; text-transform:uppercase; letter-spacing:0.3px; }
  td { padding:12px; border-bottom:1px solid #e2e8f0; font-size:13px; }
  .qty { text-align:center; }
  .amount { text-align:right; font-weight:600; }
  
  .totals { margin-top:28px; display:flex; justify-content:flex-end; }
  .totals-block { min-width:300px; }
  .total-row { display:flex; justify-content:space-between; padding:10px 0; font-size:14px; }
  .total-row.subtotal { color:#64748b; }
  .total-row.vat { color:#64748b; border-bottom:1px solid #e2e8f0; padding-bottom:12px; }
  .total-row.final { 
    background:#fef2f2; 
    border:2px solid #dc2626; 
    padding:14px 16px; 
    margin-top:8px; 
    border-radius:8px;
    font-size:18px;
    font-weight:800;
    color:#dc2626;
  }
  
  .footer { margin-top:40px; padding-top:20px; border-top:1px solid #e2e8f0; }
  .payment-terms { 
    padding:16px; 
    background:#fef9c3; 
    border-radius:8px; 
    margin-bottom:16px; 
    font-size:12px; 
    color:#713f12; 
    line-height:1.6;
  }
  .notes { font-size:11px; color:#94a3b8; text-align:center; line-height:1.6; margin-top:16px; }
  
  @media print {
    body { padding:0; }
    .page-break { page-break-after:always; }
  }
</style>
</head>
<body>
  <div class="header">
    <div>
      ${logo ? `<img class="logo" src="${logo}" alt="Logo" />` : `<div class="brand">${companyName}</div>`}
    </div>
    <div class="doc-title">
      <h1>FACTURE</h1>
      <div class="number">N° ${number}</div>
      <div class="date">Date : ${formatDate(createdAt)}</div>
      <div class="status">${isPaid ? '✓ PAYÉE' : isOverdue ? '⚠ EN RETARD' : '⏳ EN ATTENTE'}</div>
    </div>
  </div>

  <div class="addresses">
    <div class="address-block">
      <h3>Émetteur</h3>
      <div class="name">${companyName}</div>
    </div>
    <div class="address-block">
      <h3>Client</h3>
      ${client ? `
        <div class="name">${client.name}</div>
        <div class="details">
          ${client.address ? `${client.address}<br/>` : ''}
          ${client.email ? `${client.email}<br/>` : ''}
          ${client.phone ? `${client.phone}` : ''}
        </div>
      ` : `<div class="name" style="color:#94a3b8;">Aucun client</div>`}
    </div>
  </div>

  ${project ? `<div class="project-ref">📁 Projet : ${project.name}</div>` : ''}
  ${dueDate ? `<div class="due-date">⏰ Date d'échéance : ${formatDate(dueDate)}</div>` : ''}

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th style="width:50%;">Description</th>
          <th class="qty" style="width:10%;">Qté</th>
          <th class="amount" style="width:20%;">Prix unitaire</th>
          <th class="amount" style="width:20%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div class="totals-block">
      <div class="total-row subtotal">
        <span>Sous-total HT</span>
        <span>${euros(subtotalCents)}</span>
      </div>
      <div class="total-row vat">
        <span>TVA (20%)</span>
        <span>${euros(vatCents)}</span>
      </div>
      <div class="total-row final">
        <span>TOTAL TTC</span>
        <span>${euros(totalCents)}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="payment-terms">
      <strong>Conditions de paiement :</strong><br/>
      Facture à régler sous 30 jours. En cas de retard de paiement, des pénalités de retard au taux de 3 fois le taux d'intérêt légal seront appliquées, ainsi qu'une indemnité forfaitaire de 40€ pour frais de recouvrement.
    </div>
    <div class="notes">
      Merci de votre confiance.<br/>
      ${companyName} - Document non contractuel
    </div>
  </div>
</body>
</html>`;
}

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
  try {
    const auth = await requireRole(["ADMIN", "MANAGER"]);
    const { id } = await ctx.params;
    
    console.log("[PRINT] Generating invoice PDF:", id);
    
    const invoice = await prisma.invoice.findFirst({
      where: { id, companyId: auth.companyId },
      include: {
        company: { select: { name: true } },
        client: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
          }
        },
        project: { select: { name: true } }
      }
    });
    
    if (!invoice) {
      console.error("[PRINT] Invoice not found:", id);
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    console.log("[PRINT] Invoice found, building HTML...");
    
    const lines = (() => {
      if (!invoice.lines) return [];
      if (Array.isArray(invoice.lines)) return invoice.lines;
      if (typeof invoice.lines === 'string') {
        try {
          return JSON.parse(invoice.lines);
        } catch {
          return [];
        }
      }
      return [];
    })();
    
    const html = buildInvoiceHtml({
      number: invoice.number,
      createdAt: invoice.createdAt,
      companyName: invoice.company.name,
      client: invoice.client,
      project: invoice.project,
      lines,
      subtotalCents: invoice.subtotalCents,
      vatCents: invoice.vatCents,
      totalCents: invoice.totalCents,
      dueDate: invoice.dueDate,
      status: invoice.status,
    });

    console.log("[PRINT] Generating PDF with Playwright...");
    
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" },
    });

    await page.close();

    console.log("[PRINT] PDF generated successfully");

    const body = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);

    return new NextResponse(body, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="Facture-${invoice.number}.pdf"`,
        "cache-control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("[PRINT] Error generating invoice PDF:", error);
    return NextResponse.json({ 
      error: "PDF_GENERATION_FAILED",
      message: error.message 
    }, { status: 500 });
  }
}
