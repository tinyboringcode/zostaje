export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const month: string | undefined = body.month;

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.ollamaEnabled) {
    return NextResponse.json({ error: "Ollama not enabled" }, { status: 400 });
  }

  // Validate month format YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Nieprawidłowy format miesiąca (oczekiwano YYYY-MM)" }, { status: 400 });
  }
  const [year, m] = month.split("-").map(Number);
  const from = new Date(year, m - 1, 1);
  const to = new Date(year, m, 0, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: { date: { gte: from, lte: to } },
    include: { category: true },
    orderBy: { amount: "desc" },
    take: 50,
  });

  const income = transactions.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);

  // Group by category
  const byCategory: Record<string, { name: string; total: number }> = {};
  transactions.filter((t) => t.type === "EXPENSE").forEach((t) => {
    const id = t.category.id;
    if (!byCategory[id]) byCategory[id] = { name: t.category.name, total: 0 };
    byCategory[id].total += t.amount;
  });

  const topCats = Object.values(byCategory)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((c) => `- ${c.name}: ${c.total.toFixed(2)} PLN`);

  const prompt = `Jesteś doradcą finansowym dla jednoosobowej działalności gospodarczej w Polsce.

Dane za ${month}:
- Przychody: ${income.toFixed(2)} PLN
- Wydatki: ${expense.toFixed(2)} PLN
- Zysk netto: ${(income - expense).toFixed(2)} PLN
- Liczba transakcji: ${transactions.length}

Top kategorie wydatków:
${topCats.join("\n")}

Napisz krótką analizę (3-4 zdania) po polsku. Wskaż na co warto zwrócić uwagę i podaj 1-2 konkretne sugestie oszczędności lub optymalizacji. Bądź konkretny i praktyczny.`;

  try {
    const res = await fetch(`${settings.ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error("Ollama error");

    const data = await res.json();
    return NextResponse.json({ analysis: data.response?.trim() });
  } catch {
    return NextResponse.json({ error: "Ollama unreachable" }, { status: 503 });
  }
}
