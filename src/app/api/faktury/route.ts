export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

// Generuje numer faktury z szablonu i licznika
function generateInvoiceNumber(template: string, counter: number, date: Date): string {
  const yyyy = date.getFullYear().toString();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const nnn = String(counter).padStart(3, "0");
  const nn = String(counter).padStart(2, "0");
  return template
    .replace("{YYYY}", yyyy)
    .replace("{MM}", mm)
    .replace("{NNN}", nnn)
    .replace("{NN}", nn)
    .replace("{N}", String(counter));
}

// Oblicza kwoty netto/VAT z kwoty brutto i stawki VAT
function calcVatAmounts(gross: number, vatRate: number) {
  if (vatRate < 0) return { netAmount: gross, vatAmount: 0 }; // ZW
  const net = gross / (1 + vatRate / 100);
  const vat = gross - net;
  return { netAmount: Math.round(net * 100) / 100, vatAmount: Math.round(vat * 100) / 100 };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const month = searchParams.get("month");
  const contractorId = searchParams.get("contractorId");

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (contractorId) where.contractorId = contractorId;
  if (month) {
    const [y, m] = month.split("-");
    const from = new Date(Number(y), Number(m) - 1, 1);
    const to = new Date(Number(y), Number(m), 1);
    where.issueDate = { gte: from, lt: to };
  }

  const invoices = await prisma.contractorInvoice.findMany({
    where,
    include: { contractor: { select: { id: true, name: true, nip: true } } },
    orderBy: { issueDate: "desc" },
  });

  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { contractorId, amount, dueDate, issueDate, vatRate, description, currency, notes, template } = body;

  if (!contractorId || !amount || !dueDate) {
    return NextResponse.json({ error: "Brak wymaganych pól: contractorId, amount, dueDate" }, { status: 400 });
  }

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings) return NextResponse.json({ error: "Brak ustawień" }, { status: 500 });

  const issueDt = issueDate ? new Date(issueDate) : new Date();
  const dueDt = new Date(dueDate);
  const rate = vatRate !== undefined ? Number(vatRate) : settings.isVatPayer ? 23 : -1;
  const gross = Number(amount);
  const { netAmount, vatAmount } = calcVatAmounts(gross, rate);

  const number = generateInvoiceNumber(settings.invoiceTemplate, settings.invoiceCounter, issueDt);

  const [invoice] = await prisma.$transaction([
    prisma.contractorInvoice.create({
      data: {
        contractorId,
        number,
        amount: gross,
        netAmount,
        vatAmount,
        vatRate: rate,
        issueDate: issueDt,
        dueDate: dueDt,
        status: dueDt < new Date() ? "overdue" : "pending",
        description: description ?? "",
        currency: currency ?? "PLN",
        template: template ?? "standard",
        notes: notes ?? "",
      },
      include: { contractor: { select: { id: true, name: true, nip: true } } },
    }),
    prisma.settings.update({
      where: { id: 1 },
      data: { invoiceCounter: { increment: 1 } },
    }),
  ]);

  return NextResponse.json(invoice, { status: 201 });
}
