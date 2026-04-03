export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function fmtAmount(n: number) { return n.toFixed(2); }
function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // YYYY-MM
  if (!month) return NextResponse.json({ error: "Brak parametru month (YYYY-MM)" }, { status: 400 });

  const [y, m] = month.split("-");
  const from = new Date(Number(y), Number(m) - 1, 1);
  const to = new Date(Number(y), Number(m), 1);

  const [settings, transactions] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.transaction.findMany({
      where: { date: { gte: from, lt: to } },
      include: { category: true, contractorRel: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const income = transactions.filter((t) => t.type === "INCOME");
  const expenses = transactions.filter((t) => t.type === "EXPENSE");
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0);

  const now = new Date().toISOString();
  const period = `${y}-${m}`;

  // JPK_KPiR (Księga Przychodów i Rozchodów) - uproszczona wersja
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<JPK xmlns="http://jpk.mf.gov.pl/wzor/2022/02/17/02171/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Naglowek>
    <KodFormularza kodSystemowy="JPK_KPiR" wersjaSchemy="1-0">JPK_KPiR</KodFormularza>
    <WariantFormularza>1</WariantFormularza>
    <CelZlozenia>1</CelZlozenia>
    <DataWytworzeniaJPK>${now}</DataWytworzeniaJPK>
    <DataOd>${fmtDate(from)}</DataOd>
    <DataDo>${fmtDate(new Date(Number(y), Number(m), 0))}</DataDo>
    <NazwaSystemu>zostaje. v1</NazwaSystemu>
  </Naglowek>
  <Podmiot1>
    <IdentyfikatorPodmiotu>
      <NIP>${esc(settings?.nip ?? "")}</NIP>
      <PelnaNazwa>${esc(settings?.companyName ?? "")}</PelnaNazwa>
    </IdentyfikatorPodmiotu>
  </Podmiot1>
  <KPiR>
${transactions.map((t, i) => `    <Zapis>
      <LpZapisu>${i + 1}</LpZapisu>
      <DataZdarzenia>${fmtDate(new Date(t.date))}</DataZdarzenia>
      <NrDowodu>${esc(t.description)}</NrDowodu>
      <OpisPozycji>${esc(t.description)}</OpisPozycji>
      <NazwaKategorii>${esc(t.category?.name ?? "")}</NazwaKategorii>
      <Kontrahent>${esc(t.contractorRel?.name ?? t.contractor ?? "")}</Kontrahent>
      ${t.type === "INCOME" ? `<Przychod>${fmtAmount(t.amount)}</Przychod><Rozchod>0.00</Rozchod>` : `<Przychod>0.00</Przychod><Rozchod>${fmtAmount(t.amount)}</Rozchod>`}
    </Zapis>`).join("\n")}
  </KPiR>
  <KPiRCtrl>
    <LiczbaZapisow>${transactions.length}</LiczbaZapisow>
    <SumaPrzychodow>${fmtAmount(totalIncome)}</SumaPrzychodow>
    <SumaRozchodow>${fmtAmount(totalExpenses)}</SumaRozchodow>
  </KPiRCtrl>
</JPK>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Content-Disposition": `attachment; filename="JPK_KPiR_${period}.xml"`,
    },
  });
}
