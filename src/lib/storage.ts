/**
 * Public storage API for the zostaje local-first vault.
 *
 * This is the ONLY module the rest of the app should import for data
 * access. It layers:
 *    crypto (AES-GCM) + keystore (session key) + db (IndexedDB) + plugin hooks
 *
 * Guarantees:
 *  - Every write is encrypted with the current session key before hitting disk.
 *  - Every read is decrypted after fetch. Decryption errors throw `EncryptionError`.
 *  - Transaction mutations emit plugin hooks. The bundled `rules-plugin`
 *    applies user rules before save; the bundled `audit-plugin` writes the
 *    audit log. Non-transaction entity mutations are still audited directly
 *    here (the hook surface is intentionally small — see CLAUDE.md).
 */

import { encrypt, decrypt, EncryptionError } from "./crypto";
import { keystore } from "./keystore";
import * as db from "./db";
import { logChange } from "./audit";
import { runHook } from "./plugins";
import type { TransactionDraft } from "./types";

export { EncryptionError };

export type EntityType = "transaction" | "kontrahent" | "setting" | "project" | "rule";

const ENTITY_TO_STORE: Record<
  EntityType,
  "transactions" | "kontrahenci" | "settings" | "projects" | "rules"
> = {
  transaction: "transactions",
  kontrahent: "kontrahenci",
  setting: "settings",
  project: "projects",
  rule: "rules",
};

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function requireKey(): CryptoKey {
  return keystore.getKey();
}

async function encryptPayload(data: unknown): Promise<string> {
  return encrypt(data, requireKey());
}

async function decryptPayload<T>(payload: string): Promise<T> {
  return (await decrypt(payload, requireKey())) as T;
}

export interface StoredEntity<T = unknown> {
  id: string;
  updatedAt: number;
  data: T;
}

// ── Transaction hook payloads ─────────────────────────────────────────────

export interface TransactionSavePayload {
  phase: "create" | "update";
  id: string;
  draft: TransactionDraft;
  previous: TransactionDraft | null;
}

export interface TransactionDeletePayload {
  id: string;
  previous: TransactionDraft | null;
}

// ─── Reads ─────────────────────────────────────────────────────────────────

export async function getAll<T>(entity: EntityType): Promise<StoredEntity<T>[]> {
  const store = ENTITY_TO_STORE[entity];
  const records = await db.getAll(store);
  const out: StoredEntity<T>[] = [];
  for (const r of records) {
    const data = await decryptPayload<T>(r.payload);
    out.push({ id: r.id, updatedAt: r.updatedAt, data });
  }
  return out;
}

export async function getById<T>(
  entity: EntityType,
  id: string
): Promise<StoredEntity<T> | null> {
  const store = ENTITY_TO_STORE[entity];
  const record = await db.getById(store, id);
  if (!record) return null;
  const data = await decryptPayload<T>(record.payload);
  return { id: record.id, updatedAt: record.updatedAt, data };
}

// ─── Writes ────────────────────────────────────────────────────────────────

export async function add<T>(
  entity: EntityType,
  data: T,
  opts: { id?: string } = {}
): Promise<StoredEntity<T>> {
  const store = ENTITY_TO_STORE[entity];
  const id = opts.id ?? randomId();

  let finalData: T = data;
  if (entity === "transaction") {
    const payload: TransactionSavePayload = {
      phase: "create",
      id,
      draft: data as unknown as TransactionDraft,
      previous: null,
    };
    const next = await runHook("transaction:before-save", payload);
    finalData = next.draft as unknown as T;
  }

  const updatedAt = Date.now();
  const encrypted = await encryptPayload(finalData);
  await db.add(store, { id, payload: encrypted, updatedAt });

  if (entity === "transaction") {
    await runHook("transaction:after-save", {
      phase: "create",
      id,
      draft: finalData as unknown as TransactionDraft,
      previous: null,
    });
  } else {
    // Non-transaction entities: no hook surface yet — log directly.
    await logChange("create", entity, id, null, finalData);
  }

  return { id, updatedAt, data: finalData };
}

export async function update<T>(
  entity: EntityType,
  id: string,
  updater: Partial<T> | ((prev: T) => T)
): Promise<StoredEntity<T>> {
  const existing = await getById<T>(entity, id);
  if (!existing) throw new Error(`Nie znaleziono: ${entity}/${id}`);

  let next: T =
    typeof updater === "function"
      ? (updater as (p: T) => T)(existing.data)
      : ({ ...(existing.data as object), ...(updater as object) } as T);

  if (entity === "transaction") {
    const hookPayload: TransactionSavePayload = {
      phase: "update",
      id,
      draft: next as unknown as TransactionDraft,
      previous: existing.data as unknown as TransactionDraft,
    };
    const transformed = await runHook("transaction:before-save", hookPayload);
    next = transformed.draft as unknown as T;
  }

  const updatedAt = Date.now();
  const encrypted = await encryptPayload(next);
  await db.update(ENTITY_TO_STORE[entity], { id, payload: encrypted, updatedAt });

  if (entity === "transaction") {
    await runHook("transaction:after-save", {
      phase: "update",
      id,
      draft: next as unknown as TransactionDraft,
      previous: existing.data as unknown as TransactionDraft,
    });
  } else {
    await logChange("update", entity, id, existing.data, next);
  }

  return { id, updatedAt, data: next };
}

export async function remove(entity: EntityType, id: string): Promise<void> {
  const existing = await getById(entity, id);

  if (entity === "transaction") {
    const payload: TransactionDeletePayload = {
      id,
      previous: (existing?.data ?? null) as TransactionDraft | null,
    };
    await runHook("transaction:before-delete", payload);
  }

  await db.remove(ENTITY_TO_STORE[entity], id);

  if (entity !== "transaction") {
    await logChange("delete", entity, id, existing?.data ?? null, null);
  }
}

// ─── Bulk operations for export/import ─────────────────────────────────────

export interface PlainSnapshot {
  transactions: StoredEntity[];
  kontrahenci: StoredEntity[];
  settings: StoredEntity[];
  projects: StoredEntity[];
  rules: StoredEntity[];
}

export async function snapshot(): Promise<PlainSnapshot> {
  return {
    transactions: await getAll("transaction"),
    kontrahenci: await getAll("kontrahent"),
    settings: await getAll("setting"),
    projects: await getAll("project"),
    rules: await getAll("rule"),
  };
}

export async function replaceAll(snap: PlainSnapshot): Promise<void> {
  await db.clearStore("transactions");
  await db.clearStore("kontrahenci");
  await db.clearStore("settings");
  await db.clearStore("projects");
  await db.clearStore("rules");
  for (const t of snap.transactions) await add("transaction", t.data, { id: t.id });
  for (const k of snap.kontrahenci) await add("kontrahent", k.data, { id: k.id });
  for (const s of snap.settings) await add("setting", s.data, { id: s.id });
  for (const p of snap.projects ?? []) await add("project", p.data, { id: p.id });
  for (const r of snap.rules ?? []) await add("rule", r.data, { id: r.id });
}

export async function mergeAll(snap: PlainSnapshot): Promise<void> {
  const merge = async (entity: EntityType, items: StoredEntity[]) => {
    for (const it of items) {
      const existing = await getById(entity, it.id);
      if (existing) await update(entity, it.id, it.data as never);
      else await add(entity, it.data, { id: it.id });
    }
  };
  await merge("transaction", snap.transactions);
  await merge("kontrahent", snap.kontrahenci);
  await merge("setting", snap.settings);
  await merge("project", snap.projects ?? []);
  await merge("rule", snap.rules ?? []);
}

export const storage = {
  getAll,
  getById,
  add,
  update,
  remove,
  snapshot,
  replaceAll,
  mergeAll,
};
