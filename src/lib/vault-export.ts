/**
 * Portable import/export for the zostaje vault.
 *
 * Two formats:
 *  1. Plain JSON  — human readable, unencrypted snapshot of current data.
 *  2. `.zostaje`  — encrypted envelope. Each export uses a FRESH salt so the
 *     exported file is self-contained and independent of the device's
 *     in-device salt.
 */

import { deriveKey, encrypt, decrypt, randomSalt, saltToBase64, saltFromBase64, EncryptionError } from "./crypto";
import { snapshot, replaceAll, mergeAll, type PlainSnapshot } from "./storage";

export const EXPORT_VERSION = 1;

export interface EncryptedExport {
  version: number;
  app: "zostaje";
  exported_at: string;
  salt: string; // base64
  data: string; // base64 encrypted PlainSnapshot
}

function todayStamp(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

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

export async function exportPlainJSON(): Promise<void> {
  const snap = await snapshot();
  const content = JSON.stringify(
    { version: EXPORT_VERSION, app: "zostaje", exported_at: new Date().toISOString(), data: snap },
    null,
    2
  );
  downloadBlob(content, `zostaje-backup-${todayStamp()}.json`, "application/json");
}

export async function exportEncrypted(password: string): Promise<void> {
  if (!password) throw new Error("Podaj hasło do eksportu");
  const snap = await snapshot();
  const salt = randomSalt(16);
  const key = await deriveKey(password, salt);
  const cipher = await encrypt(snap, key);
  const envelope: EncryptedExport = {
    version: EXPORT_VERSION,
    app: "zostaje",
    exported_at: new Date().toISOString(),
    salt: saltToBase64(salt),
    data: cipher,
  };
  downloadBlob(
    JSON.stringify(envelope, null, 2),
    `zostaje-backup-${todayStamp()}.zostaje`,
    "application/octet-stream"
  );
}

export async function importEncrypted(
  file: File,
  password: string,
  mode: "merge" | "replace"
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
    throw new EncryptionError("Nieprawidłowe hasło do pliku kopii");
  }
  if (mode === "replace") await replaceAll(snap);
  else await mergeAll(snap);
}

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
