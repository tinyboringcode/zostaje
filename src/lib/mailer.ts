import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

export async function getTransporter() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.smtpEnabled || !settings.smtpHost) {
    throw new Error("SMTP nie jest skonfigurowany. Uzupełnij ustawienia powiadomień.");
  }

  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth: settings.smtpUser
      ? { user: settings.smtpUser, pass: settings.smtpPass }
      : undefined,
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  type: string;
}) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const from = settings?.smtpUser
    ? `"${settings.companyName || "CashFlow JDG"}" <${settings.smtpUser}>`
    : `"CashFlow JDG" <noreply@cashflow.local>`;

  const transporter = await getTransporter();
  let success = true;
  try {
    await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html });
  } catch {
    success = false;
  }

  await prisma.notificationLog.create({
    data: { type: opts.type, subject: opts.subject, success },
  });

  if (!success) throw new Error("Wysyłka e-mail nie powiodła się");
}

export function budgetAlertHtml({
  companyName,
  category,
  spent,
  limit,
  percent,
  month,
}: {
  companyName: string;
  category: string;
  spent: number;
  limit: number;
  percent: number;
  month: string;
}) {
  const color = percent >= 100 ? "#ef4444" : "#f59e0b";
  const label = percent >= 100 ? "Przekroczono budżet!" : "Zbliżasz się do limitu";
  return `
    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
      <h2 style="color: ${color}; margin-bottom: 8px;">⚠️ ${label}</h2>
      <p style="color: #555; margin-bottom: 16px;">
        Raport budżetowy — <strong>${companyName}</strong> · ${month}
      </p>
      <div style="background: #f9fafb; border-radius: 10px; padding: 16px; border: 1px solid #e5e7eb;">
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${category}</div>
        <div style="color: #6b7280; font-size: 14px;">
          Wydano: <strong style="color: #111;">${spent.toFixed(2)} PLN</strong>
          z limitu <strong>${limit.toFixed(2)} PLN</strong>
        </div>
        <div style="margin-top: 12px; background: #e5e7eb; border-radius: 9999px; height: 10px;">
          <div style="background: ${color}; height: 10px; border-radius: 9999px; width: ${Math.min(percent, 100)}%;"></div>
        </div>
        <div style="text-align: right; font-size: 13px; margin-top: 4px; color: ${color}; font-weight: 600;">
          ${percent.toFixed(0)}%
        </div>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        Wiadomość wysłana automatycznie przez CashFlow JDG
      </p>
    </div>
  `;
}

export function digestHtml({
  companyName,
  period,
  income,
  expense,
  profit,
  transactionCount,
  topCategories,
}: {
  companyName: string;
  period: string;
  income: number;
  expense: number;
  profit: number;
  transactionCount: number;
  topCategories: Array<{ name: string; emoji: string; total: number }>;
}) {
  const profitColor = profit >= 0 ? "#22c55e" : "#ef4444";
  const profitLabel = profit >= 0 ? "Zysk" : "Strata";
  const fmt = (n: number) =>
    new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(n);

  const catRows = topCategories
    .slice(0, 5)
    .map(
      (c) => `
      <tr>
        <td style="padding: 7px 12px; border-bottom: 1px solid #f3f4f6;">${c.emoji} ${c.name}</td>
        <td style="padding: 7px 12px; border-bottom: 1px solid #f3f4f6; text-align: right; color: #ef4444; font-weight: 600;">${fmt(c.total)}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background: #fff;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 16px; padding: 24px; margin-bottom: 24px; color: white;">
        <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 6px;">Raport finansowy</div>
        <div style="font-size: 22px; font-weight: 700; margin-bottom: 4px;">${companyName}</div>
        <div style="opacity: 0.85; font-size: 14px;">${period}</div>
      </div>

      <div style="display: grid; gap: 12px; margin-bottom: 24px;">
        <table width="100%" cellspacing="0"><tr>
          <td style="padding: 14px 16px; background: #f0fdf4; border-radius: 10px; text-align: center;">
            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Przychody</div>
            <div style="font-size: 20px; font-weight: 700; color: #16a34a; margin-top: 4px;">${fmt(income)}</div>
          </td>
          <td width="12"></td>
          <td style="padding: 14px 16px; background: #fff1f2; border-radius: 10px; text-align: center;">
            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Wydatki</div>
            <div style="font-size: 20px; font-weight: 700; color: #ef4444; margin-top: 4px;">${fmt(expense)}</div>
          </td>
          <td width="12"></td>
          <td style="padding: 14px 16px; background: #f5f3ff; border-radius: 10px; text-align: center;">
            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${profitLabel}</div>
            <div style="font-size: 20px; font-weight: 700; color: ${profitColor}; margin-top: 4px;">${fmt(Math.abs(profit))}</div>
          </td>
        </tr></table>
      </div>

      <div style="background: #f9fafb; border-radius: 10px; padding: 6px 0; margin-bottom: 20px;">
        <div style="padding: 10px 12px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">
          Top wydatki — ${transactionCount} transakcji
        </div>
        <table width="100%" cellspacing="0" style="font-size: 14px;">
          ${catRows || `<tr><td style="padding: 12px; color: #9ca3af; text-align: center;" colspan="2">Brak wydatków w tym okresie</td></tr>`}
        </table>
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
        CashFlow JDG — automatyczny raport e-mail<br>
        Możesz wyłączyć tę opcję w Ustawienia → Powiadomienia
      </p>
    </div>
  `;
}

export function overdueInvoiceHtml({
  companyName,
  invoices,
}: {
  companyName: string;
  invoices: Array<{ contractor: string; number: string; amount: number; dueDate: string; daysOverdue: number }>;
}) {
  const rows = invoices
    .map(
      (inv) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${inv.contractor}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${inv.number}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${inv.amount.toFixed(2)} PLN</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #ef4444;">${inv.daysOverdue} dni</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #ef4444; margin-bottom: 8px;">🔴 Przeterminowane faktury</h2>
      <p style="color: #555; margin-bottom: 16px;"><strong>${companyName}</strong> · ${invoices.length} faktur(y) wymaga uwagi</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px 12px; text-align: left;">Kontrahent</th>
            <th style="padding: 8px 12px; text-align: left;">Nr faktury</th>
            <th style="padding: 8px 12px; text-align: right;">Kwota</th>
            <th style="padding: 8px 12px; text-align: left;">Po terminie</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">CashFlow JDG — automatyczne powiadomienie</p>
    </div>
  `;
}
