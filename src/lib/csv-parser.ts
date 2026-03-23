export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: "INCOME" | "EXPENSE";
}

/**
 * Parses CSV from Polish banks (PKO, mBank, Santander, ING).
 * Tries multiple common formats.
 */
export function parseCSV(content: string): ParsedTransaction[] {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedTransaction[] = [];

  for (const line of lines) {
    const cols = splitCSVLine(line);
    if (cols.length < 3) continue;

    // Try to find date, description, amount in columns
    let date: Date | null = null;
    let description = "";
    let amount: number | null = null;

    // Detect date column (YYYY-MM-DD or DD.MM.YYYY or DD-MM-YYYY)
    for (let i = 0; i < Math.min(cols.length, 4); i++) {
      const d = parseDate(cols[i]);
      if (d) {
        date = d;
        // Description is usually next non-numeric column
        description = cols[i + 1] ?? "";
        // Amount: look for numeric value in remaining columns
        for (let j = i + 2; j < cols.length; j++) {
          const v = parseAmount(cols[j]);
          if (v !== null) {
            amount = v;
            // If there's a debit/credit column override sign
            if (cols.length > j + 1) {
              const next = cols[j + 1].replace(/\s/g, "");
              if (next === "D" || next === "WN") amount = -Math.abs(amount);
              if (next === "C" || next === "MA") amount = Math.abs(amount);
            }
            break;
          }
        }
        break;
      }
    }

    if (!date || amount === null || description === "") continue;
    if (isNaN(amount)) continue;

    results.push({
      date,
      description: description.replace(/^["']|["']$/g, "").trim(),
      amount: Math.abs(amount),
      type: amount >= 0 ? "INCOME" : "EXPENSE",
    });
  }

  return results;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  const sep = line.includes(";") ? ";" : ",";

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === sep && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(s: string): Date | null {
  s = s.replace(/^["']|["']$/g, "").trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  // DD.MM.YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{2})[.\-](\d{2})[.\-](\d{4})$/);
  if (m) {
    const d = new Date(`${m[3]}-${m[2]}-${m[1]}`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseAmount(s: string): number | null {
  s = s.replace(/^["']|["']$/g, "").trim();
  // Replace Polish thousands separator (space or dot before comma)
  s = s.replace(/\s/g, "").replace(/,/g, ".");
  // Handle 1.234.56 → 1234.56 (remove thousands dots)
  const parts = s.split(".");
  if (parts.length > 2) {
    s = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
  }
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
