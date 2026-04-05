/**
 * Audit log — every mutation through `storage.ts` is recorded here as an
 * encrypted entry in the `audit_log` IndexedDB store.
 *
 * NOTE: To avoid a circular import with `storage.ts`, this module talks to
 * `db.ts` + `crypto.ts` + `keystore.ts` directly instead of going through
 * the storage layer.
 */

import { encrypt, decrypt } from "./crypto";
import { keystore } from "./keystore";
import * as db from "./db";

export type AuditAction = "create" | "update" | "delete";
export type AuditEntity = "transaction" | "kontrahent" | "setting";

export interface AuditEntry {
  id: string;
  timestamp: number;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  before: unknown;
  after: unknown;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function logChange(
  action: AuditAction,
  entity: AuditEntity,
  entityId: string,
  before: unknown,
  after: unknown
): Promise<void> {
  if (!keystore.isUnlocked()) return; // no-op if locked (shouldn't happen)
  const entry: AuditEntry = {
    id: randomId(),
    timestamp: Date.now(),
    action,
    entity,
    entityId,
    before,
    after,
  };
  const payload = await encrypt(entry, keystore.getKey());
  await db.add("audit_log", { id: entry.id, payload, updatedAt: entry.timestamp });
}

export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  const key = keystore.getKey();
  const records = await db.getAll("audit_log");
  const out: AuditEntry[] = [];
  for (const r of records) {
    try {
      const entry = (await decrypt(r.payload, key)) as AuditEntry;
      out.push(entry);
    } catch {
      // Skip corrupted/legacy entries rather than crashing the view.
    }
  }
  out.sort((a, b) => b.timestamp - a.timestamp);
  return out.slice(0, limit);
}

export async function clearAudit(): Promise<void> {
  await db.clearStore("audit_log");
}
