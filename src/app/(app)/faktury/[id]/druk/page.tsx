import { prisma } from "@/server/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | string) {
  return new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}
function fmtMoney(n: number, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " " + currency;
}

function vatLabel(rate: number) {
  if (rate < 0) return "ZW";
  if (rate === 0) return "0%";
  return `${rate}%`;
}

export default async function DrukPage({ params }: { params: { id: string } }) {
  const [invoice, settings] = await Promise.all([
    prisma.contractorInvoice.findUnique({
      where: { id: params.id },
      include: { contractor: true },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);

  if (!invoice) notFound();

  const netAmount = invoice.netAmount > 0 ? invoice.netAmount : invoice.amount / (1 + invoice.vatRate / 100);
  const vatAmount = invoice.vatAmount > 0 ? invoice.vatAmount : invoice.amount - netAmount;
  const isProforma = invoice.template === "proforma";

  return (
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{invoice.number}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #1a1a1a; background: #fff; }
          .page { max-width: 210mm; margin: 0 auto; padding: 15mm 15mm 20mm; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; }
          .header-left h1 { font-size: 22pt; font-weight: 700; letter-spacing: -0.5px; }
          .header-left .number { font-size: 11pt; color: #555; margin-top: 4px; }
          .header-right { text-align: right; }
          .header-right .type-badge { display: inline-block; padding: 3px 10px; background: #1a1a1a; color: #fff; font-size: 8pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 3px; }
          .header-right .dates { margin-top: 8px; font-size: 9.5pt; color: #444; line-height: 1.7; }
          .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
          .party { padding: 14px 16px; border: 1px solid #e0e0e0; border-radius: 4px; }
          .party-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 8px; }
          .party-name { font-size: 12pt; font-weight: 700; margin-bottom: 4px; }
          .party-detail { font-size: 9.5pt; color: #444; line-height: 1.6; }
          .party-nip { font-size: 9.5pt; font-weight: 600; color: #1a1a1a; margin-top: 4px; }
          .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt; }
          .items-table th { background: #f5f5f5; padding: 8px 10px; text-align: left; font-size: 8.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #555; border-bottom: 2px solid #ddd; }
          .items-table td { padding: 10px 10px; border-bottom: 1px solid #f0f0f0; }
          .items-table .num { text-align: center; color: #888; }
          .items-table .money { text-align: right; font-variant-numeric: tabular-nums; }
          .summary { display: flex; justify-content: flex-end; margin-top: 4px; }
          .summary-table { width: 260px; font-size: 10pt; }
          .summary-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f0f0f0; }
          .summary-row.total { font-weight: 700; font-size: 12pt; border-bottom: 2px solid #1a1a1a; padding: 8px 0; }
          .payment { margin-top: 28px; padding: 14px 16px; border: 1px solid #e0e0e0; border-radius: 4px; }
          .payment-label { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 8px; }
          .payment-detail { font-size: 10pt; line-height: 1.8; }
          .notes { margin-top: 20px; padding: 12px 16px; background: #fafafa; border-radius: 4px; font-size: 9.5pt; color: #555; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 9pt; color: #888; border-top: 1px solid #e0e0e0; padding-top: 12px; }
          .print-btn { position: fixed; bottom: 20px; right: 20px; padding: 10px 20px; background: #1a1a1a; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.2); z-index: 100; }
          @media print {
            .print-btn { display: none !important; }
            body { font-size: 10pt; }
            .page { padding: 0; max-width: none; }
          }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="header">
            <div className="header-left">
              <h1>{isProforma ? "PROFORMA" : "FAKTURA VAT"}</h1>
              <div className="number">Nr: <strong>{invoice.number}</strong></div>
            </div>
            <div className="header-right">
              <div className="type-badge">{invoice.currency !== "PLN" ? invoice.currency : ""} {invoice.status === "paid" ? "✓ Opłacona" : "Do zapłaty"}</div>
              <div className="dates">
                Data wystawienia: <strong>{fmtDate(invoice.issueDate)}</strong><br />
                Termin płatności: <strong>{fmtDate(invoice.dueDate)}</strong>
                {invoice.paidAt && <><br />Data zapłaty: <strong>{fmtDate(invoice.paidAt)}</strong></>}
              </div>
            </div>
          </div>

          <div className="parties">
            <div className="party">
              <div className="party-label">Sprzedawca</div>
              <div className="party-name">{settings?.companyName ?? "—"}</div>
              <div className="party-detail">{settings?.address}</div>
              {settings?.nip && <div className="party-nip">NIP: {settings.nip}</div>}
            </div>
            <div className="party">
              <div className="party-label">Nabywca</div>
              <div className="party-name">{invoice.contractor.name}</div>
              <div className="party-detail">
                {invoice.contractor.addressStreet && <>{invoice.contractor.addressStreet}<br /></>}
                {invoice.contractor.addressPostal} {invoice.contractor.addressCity}
              </div>
              {invoice.contractor.nip && <div className="party-nip">NIP: {invoice.contractor.nip}</div>}
            </div>
          </div>

          <table className="items-table">
            <thead>
              <tr>
                <th className="num">Lp.</th>
                <th>Nazwa towaru / usługi</th>
                <th className="money">Cena netto</th>
                <th className="money">VAT</th>
                <th className="money">Kwota VAT</th>
                <th className="money">Brutto</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="num">1</td>
                <td>{invoice.description || invoice.notes || "Usługa"}</td>
                <td className="money">{fmtMoney(netAmount, invoice.currency)}</td>
                <td className="money">{vatLabel(invoice.vatRate)}</td>
                <td className="money">{fmtMoney(vatAmount, invoice.currency)}</td>
                <td className="money"><strong>{fmtMoney(invoice.amount, invoice.currency)}</strong></td>
              </tr>
            </tbody>
          </table>

          <div className="summary">
            <div className="summary-table">
              <div className="summary-row">
                <span>Wartość netto:</span>
                <span>{fmtMoney(netAmount, invoice.currency)}</span>
              </div>
              <div className="summary-row">
                <span>VAT {vatLabel(invoice.vatRate)}:</span>
                <span>{fmtMoney(vatAmount, invoice.currency)}</span>
              </div>
              <div className="summary-row total">
                <span>Do zapłaty:</span>
                <span>{fmtMoney(invoice.amount, invoice.currency)}</span>
              </div>
            </div>
          </div>

          <div className="payment">
            <div className="payment-label">Forma płatności</div>
            <div className="payment-detail">
              Przelew bankowy · Termin: <strong>{fmtDate(invoice.dueDate)}</strong>
              {settings?.bankAccount && <><br />Nr konta: <strong>{settings.bankAccount}</strong></>}
            </div>
          </div>

          {invoice.notes && (
            <div className="notes">
              <strong>Uwagi:</strong> {invoice.notes}
            </div>
          )}

          {invoice.ksefRef && (
            <div className="notes" style={{ marginTop: 8 }}>
              <strong>Nr KSeF:</strong> {invoice.ksefRef}
            </div>
          )}

          <div className="footer">
            <span>Wygenerowano: {fmtDate(new Date())}</span>
            <span>zostaje. · System finansowy JDG</span>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('print-btn').addEventListener('click', function() { window.print(); });
          });
        ` }} />
        <button id="print-btn" className="print-btn">
          🖨 Drukuj / Zapisz PDF
        </button>
      </body>
    </html>
  );
}
