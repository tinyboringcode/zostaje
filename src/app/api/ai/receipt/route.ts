export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.ollamaEnabled) {
    return NextResponse.json({ error: "Ollama not enabled" }, { status: 400 });
  }

  const formData = await req.formData();
  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });

  // Convert to base64
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const prompt = `Jesteś systemem OCR do odczytywania paragonów i faktur.
Przeanalizuj ten obraz i wyodrębnij dane w formacie JSON.

Odpowiedz WYŁĄCZNIE w formacie JSON (bez markdown, bez wyjaśnień):
{
  "amount": <liczba, kwota do zapłaty lub łączna kwota brutto>,
  "date": "<data w formacie YYYY-MM-DD lub null jeśli nieczytelna>",
  "vendor": "<nazwa sklepu/firmy lub null>",
  "description": "<krótki opis czego dotyczy paragon/faktura lub null>",
  "vatAmount": <kwota VAT jako liczba lub null>
}

Jeśli pole jest nieczytelne lub nie istnieje, użyj null.`;

  try {
    const model = settings.ollamaModel.includes("llava")
      ? settings.ollamaModel
      : "llava";

    const res = await fetch(`${settings.ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        images: [base64],
        stream: false,
        format: "json",
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);

    const data = await res.json();
    let parsed: {
      amount?: number | null;
      date?: string | null;
      vendor?: string | null;
      description?: string | null;
      vatAmount?: number | null;
    } = {};

    try {
      parsed = JSON.parse(data.response);
    } catch {
      // Try to extract JSON from response
      const match = data.response?.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    return NextResponse.json({
      amount: parsed.amount ?? null,
      date: parsed.date ?? null,
      vendor: parsed.vendor ?? null,
      description: parsed.description ?? null,
      vatAmount: parsed.vatAmount ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
