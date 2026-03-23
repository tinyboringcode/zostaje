export interface ParsedInput {
  amount: number;
  type: "income" | "expense";
  description: string;
  contractor: string;
  date: Date;
  confidence: number; // 0–1, jak pewny jesteśmy interpretacji
}

// Słowa wymuszające typ
const EXPENSE_KEYWORDS = [
  "zus", "pit", "vat", "składk", "podatek", "podatku",
  "hosting", "aws", "gcp", "azure", "ovh", "hetzner",
  "google", "adobe", "notion", "github", "gitlab", "figma",
  "leasing", "czynsz", "najem", "paliwo", "tankowanie",
  "parking", "autostrda", "autobus", "bilet",
  "szkolenie", "kurs", "konferencja",
  "faktura vat", "zakup", "sklep", "allegro", "amazon",
  "prąd", "gaz", "telefon", "internet", "orange", "play", "t-mobile",
  "ubezpieczenie", "pzu", "warta",
  "rachun", "opłat",
];

const INCOME_KEYWORDS = [
  "faktura", "fv ", "fv/", "wpłata od", "przelew od",
  "zaliczka od", "wynagrodzenie", "honorarium", "przychód",
  "płatność od",
];

// Wyciąga liczbę z tekstu (obsługuje "1 500", "1500", "1500.50", "1500,50", "-245")
function extractAmount(raw: string): { amount: number; negative: boolean; rest: string } | null {
  // Normalizuj: usuń spacje wewnątrz liczb, zamień przecinek na kropkę
  const normalized = raw.replace(/(\d)\s+(\d)/g, "$1$2").replace(",", ".");

  const match = normalized.match(/(-?\d+(?:\.\d{1,2})?)/);
  if (!match) return null;

  const amount = parseFloat(match[1]);
  const negative = amount < 0;
  const rest = normalized.replace(match[0], "").trim();

  return { amount: Math.abs(amount), negative, rest };
}

// Czy tekst zawiera słowo kluczowe (częściowe dopasowanie)
function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function parseTransactionInput(raw: string): ParsedInput | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const extracted = extractAmount(trimmed);
  if (!extracted || extracted.amount <= 0) return null;

  const { amount, negative, rest } = extracted;

  // Ustal typ
  let type: "income" | "expense";
  let confidence = 0.7;

  if (negative) {
    type = "expense";
    confidence = 0.95;
  } else if (matchesKeywords(trimmed, EXPENSE_KEYWORDS)) {
    type = "expense";
    confidence = 0.9;
  } else if (matchesKeywords(trimmed, INCOME_KEYWORDS)) {
    type = "income";
    confidence = 0.9;
  } else {
    // Domyślnie przychód (JDG wpisuje kwoty głównie jako przychody)
    type = "income";
    confidence = 0.65;
  }

  // Reszta tekstu → opis / kontrahent
  const description = rest
    .replace(/^[-–—]\s*/, "") // usuń myślnik na początku
    .trim();

  // Prosty heurystyk: jeśli opis wygląda jak nazwa firmy (duże litery, Sp, Ltd)
  // traktuj jako kontrahent, resztę jako opis
  const contractorMatch = description.match(
    /^([A-ZŁÓŚĄŻŹĆĘŃ][A-Za-złóśążźćęńÓŁŚĄŻŹĆĘŃ0-9\s.,-]{1,40}(?:Sp\.?\s*z\s*o\.?o\.?|S\.?A\.?|Ltd\.?|LLC\.?)?)/
  );

  const contractor = contractorMatch
    ? contractorMatch[1].trim().replace(/\s+/g, " ")
    : "";

  return {
    amount,
    type,
    description: description || "",
    contractor,
    date: new Date(),
    confidence,
  };
}

// Formatowanie kwoty w polskim stylu: 6 500,00 zł
export function formatPLN(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Formatowanie daty: DD.MM (bieżący rok) lub DD.MM.YY (inne lata)
export function formatDateShort(date: Date): string {
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return "dziś";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");

  if (date.getFullYear() === now.getFullYear()) {
    return `${dd}.${mm}`;
  }
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}.${mm}.${yy}`;
}
