import { prisma } from "@/server/db";

const STOP_WORDS = new Set([
  "sp", "z", "o", "o.", "s.a", "sa", "ltd", "gmbh", "inc",
  "za", "na", "do", "od", "w", "we", "z", "ze", "przez",
  "dla", "po", "przy", "ul", "pl", "al", "str", "nr", "nip",
  "sp.", "z.o.o", "z.o.o.", "sp.z",
  "faktura", "fv", "rachunek", "płatność", "przelew", "zakup",
  "sprzedaż", "usługa", "usługi", "towar", "towary",
  "01", "02", "03", "04", "05", "06", "07", "08", "09",
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31",
  "2023", "2024", "2025", "2026",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźżа-я\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

export async function learnFromTransaction(
  description: string,
  categoryId: string,
  txType: string
): Promise<void> {
  const words = tokenize(description);
  if (!words.length) return;

  for (const word of words) {
    await prisma.categoryRule.upsert({
      where: { word_categoryId_txType: { word, categoryId, txType } },
      update: { count: { increment: 1 } },
      create: { word, categoryId, txType, count: 1 },
    });
  }
}

export async function suggestCategory(
  description: string,
  txType: string
): Promise<{ categoryId: string; confidence: number } | null> {
  const words = tokenize(description);
  if (!words.length) return null;

  const rules = await prisma.categoryRule.findMany({
    where: { word: { in: words }, txType },
  });

  if (!rules.length) return null;

  // Aggregate scores per category
  const scores = new Map<string, number>();
  for (const rule of rules) {
    scores.set(rule.categoryId, (scores.get(rule.categoryId) ?? 0) + rule.count);
  }

  let bestCategory = "";
  let bestScore = 0;
  let totalScore = 0;

  for (const [catId, score] of Array.from(scores.entries())) {
    totalScore += score;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = catId;
    }
  }

  const confidence = totalScore > 0 ? bestScore / totalScore : 0;
  // Only suggest if reasonably confident
  if (confidence < 0.4) return null;

  return { categoryId: bestCategory, confidence };
}
