export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = searchParams.get("year");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter: Record<string, Date> = {};
  if (year) {
    dateFilter.gte = new Date(`${year}-01-01`);
    dateFilter.lte = new Date(`${year}-12-31T23:59:59`);
  } else if (from || to) {
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
  }

  const transactions = await prisma.transaction.findMany({
    where: Object.keys(dateFilter).length ? { date: dateFilter } : {},
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const header = "Data;Typ;Kategoria;Opis;Kontrahent;Kwota";
  const rows = transactions.map((tx) => {
    const date = tx.date.toISOString().split("T")[0];
    const type = tx.type === "INCOME" ? "Przychód" : "Wydatek";
    const amount = tx.amount.toFixed(2).replace(".", ",");
    return [date, type, tx.category.name, `"${tx.description}"`, tx.contractor ?? "", amount].join(";");
  });

  const csv = [header, ...rows].join("\n");
  const bom = "\uFEFF"; // UTF-8 BOM for Excel

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cashflow-export.csv"`,
    },
  });
}
