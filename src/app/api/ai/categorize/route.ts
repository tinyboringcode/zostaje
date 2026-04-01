export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function POST(req: NextRequest) {
  const { description, amount, type } = await req.json();

  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.ollamaEnabled) {
    return NextResponse.json({ error: "Ollama not enabled" }, { status: 400 });
  }

  const categories = await prisma.category.findMany({
    where: { isArchived: false, type: type ?? "EXPENSE" },
    select: { id: true, name: true, emoji: true },
  });

  const catList = categories.map((c) => `- ${c.id}: ${c.emoji} ${c.name}`).join("\n");

  const prompt = `Jesteś asystentem do kategoryzacji wydatków JDG w Polsce.

Transakcja:
- Opis: "${description}"
- Kwota: ${amount} PLN
- Typ: ${type === "INCOME" ? "przychód" : "wydatek"}

Dostępne kategorie:
${catList}

Odpowiedz TYLKO identyfikatorem (id) najbardziej pasującej kategorii. Nic więcej.`;

  try {
    const res = await fetch(`${settings.ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        prompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error("Ollama error");

    const data = await res.json();
    const rawId = data.response?.trim();

    // Validate that the returned id exists
    const matched = categories.find((c) => c.id === rawId);
    if (!matched) {
      return NextResponse.json({ categoryId: null, error: "No match" });
    }

    return NextResponse.json({ categoryId: matched.id, categoryName: matched.name });
  } catch {
    return NextResponse.json({ categoryId: null, error: "Ollama unreachable" }, { status: 503 });
  }
}
