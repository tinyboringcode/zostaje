export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

const SUPPORTED = ["EUR", "USD", "GBP", "CHF", "CZK", "NOK", "SEK", "DKK", "HUF"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const currency = (searchParams.get("currency") ?? "EUR").toUpperCase();
  const date = searchParams.get("date"); // YYYY-MM-DD, optional

  if (currency === "PLN") return NextResponse.json({ rate: 1, currency: "PLN", date: new Date().toISOString().slice(0, 10) });
  if (!SUPPORTED.includes(currency)) {
    return NextResponse.json({ error: `Waluta ${currency} nieobsługiwana` }, { status: 400 });
  }

  try {
    const url = date
      ? `https://api.nbp.pl/api/exchangerates/rates/A/${currency}/${date}/?format=json`
      : `https://api.nbp.pl/api/exchangerates/rates/A/${currency}/?format=json`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      // Spróbuj ostatni dostępny kurs jeśli data jest weekendowa/święto
      const fallback = await fetch(
        `https://api.nbp.pl/api/exchangerates/rates/A/${currency}/last/1/?format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!fallback.ok) throw new Error("NBP API niedostępne");
      const data = await fallback.json();
      const rate = data.rates[0];
      return NextResponse.json({ rate: rate.mid, currency, date: rate.effectiveDate, source: "last" });
    }

    const data = await res.json();
    const rate = data.rates[0];
    return NextResponse.json({ rate: rate.mid, currency, date: rate.effectiveDate });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Błąd";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
