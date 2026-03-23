export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const nip = req.nextUrl.searchParams.get("nip")?.replace(/\D/g, "");
  if (!nip || nip.length !== 10) {
    return NextResponse.json({ error: "Nieprawidłowy NIP" }, { status: 400 });
  }

  // Use local date (Polish timezone) to avoid UTC off-by-one
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const url = `https://wl-api.mf.gov.pl/api/search/nip/${nip}?date=${date}`;

  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Nie znaleziono firmy w rejestrze MF" }, { status: 404 });
    }

    const data = await res.json();
    const subject = data?.result?.subject;

    if (!subject) {
      return NextResponse.json({ error: "Brak danych dla podanego NIP" }, { status: 404 });
    }

    // Extract address parts
    const addrRaw: string = subject.workingAddress ?? subject.residenceAddress ?? "";
    // Format: "ul. Przykładowa 1, 00-001 Warszawa" or "Przykładowa 1 00-001 Warszawa"
    const postalMatch = addrRaw.match(/(\d{2}-\d{3})\s+(.+)/);
    const addressPostal = postalMatch?.[1] ?? "";
    const addressCity = postalMatch?.[2]?.split(",")[0]?.trim() ?? "";
    const addressStreet = addrRaw
      .replace(postalMatch?.[0] ?? "", "")
      .replace(/,\s*$/, "")
      .trim();

    return NextResponse.json({
      name: subject.name ?? "",
      nip: subject.nip ?? nip,
      regon: subject.regon ?? "",
      krs: subject.krs ?? "",
      addressStreet,
      addressCity,
      addressPostal,
      addressCountry: "PL",
      statusVat: subject.statusVat ?? "Nieznany",
      accountNumbers: subject.accountNumbers ?? [],
    });
  } catch {
    return NextResponse.json({ error: "Błąd połączenia z API MF" }, { status: 503 });
  }
}
