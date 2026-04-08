/**
 * Portable import/export for the zostaje vault.
 *
 * Two formats:
 *  1. Plain JSON  — human readable, unencrypted snapshot of current data.
 *  2. `.zostaje`  — encrypted envelope. Each export uses a FRESH salt so the
 *     exported file is self-contained and independent of the device's
 *     in-device salt.
 *
 * Version 2 adds:
 *  - `format: "zostaje-vault"` identifier
 *  - `checksum` — SHA-256 of decrypted data for integrity verification
 *  - `schema_version` — database version for migration compatibility
 *  - `metadata` — entity counts, date range, app version (plaintext)
 */

import { deriveKey, encrypt, decrypt, randomSalt, saltToBase64, saltFromBase64, EncryptionError } from "./crypto";
import { snapshot, replaceAll, mergeAll, type PlainSnapshot } from "./storage";

export const EXPORT_VERSION = 2;

// ── Types ────────────────────────────────────────────────────────────────

/** Version 1 format (legacy, still importable) */
export interface EncryptedExportV1 {
  version: 1;
  app: "zostaje";
  exported_at: string;
  salt: string;
  data: string;
}

/** Version 2 format (current) */
export interface EncryptedExportV2 {
  version: 2;
  format: "zostaje-vault";
  app: "zostaje";
  exported_at: string;
  schema_version: number;
  salt: string;
  checksum: string; // SHA-256 hex of plaintext JSON
  data: string;     // encrypted PlainSnapshot
  metadata: {
    entity_counts: {
      transactions: number;
      kontrahenci: number;
      projects: number;
      rules: number;
    };
    date_range: { from: string; to: string } | null;
    app_version: string;
  };
}

export type EncryptedExport = EncryptedExportV1 | EncryptedExportV2;

// ── Helpers ──────────────────────────────────────────────────────────────

function todayStamp(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

async function sha256hex(data: string): Promise<string> {
  const buf = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function computeMetadata(snap: PlainSnapshot): EncryptedExportV2["metadata"] {
  const txDates = snap.transactions
    .map((t) => {
      const data = t.data as { date?: string };
      return data?.date ?? "";
    })
    .filter(Boolean)
    .sort();

  return {
    entity_counts: {
      transactions: snap.transactions.length,
      kontrahenci: snap.kontrahenci.length,
      projects: (snap.projects ?? []).length,
      rules: (snap.rules ?? []).length,
    },
    date_range: txDates.length > 0
      ? { from: txDates[0], to: txDates[txDates.length - 1] }
      : null,
    app_version: "2.0.0",
  };
}

const DB_SCHEMA_VERSION = 2; // matches db.ts DB_VERSION

// ── Download helper ──────────────────────────────────────────────────────

export function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Export: Plain JSON ───────────────────────────────────────────────────

export async function exportPlainJSON(): Promise<void> {
  const snap = await snapshot();
  const content = JSON.stringify(
    {
      version: EXPORT_VERSION,
      format: "zostaje-vault",
      app: "zostaje",
      exported_at: new Date().toISOString(),
      data: snap,
      metadata: computeMetadata(snap),
    },
    null,
    2,
  );
  downloadBlob(content, `zostaje-backup-${todayStamp()}.json`, "application/json");
}

// ── Export: Encrypted .zostaje ────────────────────────────────────────────

export async function exportEncrypted(password: string): Promise<void> {
  if (!password) throw new Error("Podaj haslo do eksportu");

  const snap = await snapshot();
  const plaintext = JSON.stringify(snap);
  const checksum = await sha256hex(plaintext);

  const salt = randomSalt(16);
  const key = await deriveKey(password, salt);
  const cipher = await encrypt(snap, key);

  const envelope: EncryptedExportV2 = {
    version: EXPORT_VERSION,
    format: "zostaje-vault",
    app: "zostaje",
    exported_at: new Date().toISOString(),
    schema_version: DB_SCHEMA_VERSION,
    salt: saltToBase64(salt),
    checksum,
    data: cipher,
    metadata: computeMetadata(snap),
  };

  downloadBlob(
    JSON.stringify(envelope, null, 2),
    `zostaje-backup-${todayStamp()}.zostaje`,
    "application/x-zostaje",
  );
}

// ── Import: Encrypted .zostaje ───────────────────────────────────────────

export async function importEncrypted(
  file: File,
  password: string,
  mode: "merge" | "replace",
): Promise<void> {
  const text = await file.text();
  let envelope: EncryptedExport;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new Error("Niepoprawny format pliku");
  }

  if (envelope.app !== "zostaje" || !envelope.data || !envelope.salt) {
    throw new Error("To nie jest plik .zostaje");
  }

  const salt = saltFromBase64(envelope.salt);
  const key = await deriveKey(password, salt);

  let snap: PlainSnapshot;
  try {
    snap = (await decrypt(envelope.data, key)) as PlainSnapshot;
  } catch {
    throw new EncryptionError("Nieprawidlowe haslo do pliku kopii");
  }

  // V2: verify checksum
  if (envelope.version >= 2 && "checksum" in envelope) {
    const v2 = envelope as EncryptedExportV2;
    const plaintext = JSON.stringify(snap);
    const actual = await sha256hex(plaintext);
    if (actual !== v2.checksum) {
      throw new Error("Suma kontrolna nie zgadza sie — plik moze byc uszkodzony");
    }
  }

  if (mode === "replace") await replaceAll(snap);
  else await mergeAll(snap);
}

// ── Import: Plain JSON ───────────────────────────────────────────────────

export async function importPlainJSON(file: File, mode: "merge" | "replace"): Promise<void> {
  const text = await file.text();
  let parsed: { data?: PlainSnapshot };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Niepoprawny format pliku");
  }
  if (!parsed.data) throw new Error("Brak sekcji data w pliku");
  if (mode === "replace") await replaceAll(parsed.data);
  else await mergeAll(parsed.data);
}
