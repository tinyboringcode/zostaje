/**
 * IndexedDB wrapper for the local-first vault. This module is the ONLY
 * direct consumer of IndexedDB. All reads/writes from the rest of the
 * app must go through `src/lib/storage.ts` (which layers encryption on top).
 *
 * Records are stored as opaque envelopes: `{ id, payload }` where
 * `payload` is an encrypted base64 blob (except in `meta`, which holds
 * a small plaintext verification token and schema version).
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export const DB_NAME = "zostaje-db";
export const DB_VERSION = 2;

export type StoreName =
  | "transactions"
  | "kontrahenci"
  | "settings"
  | "audit_log"
  | "projects"
  | "rules"
  | "meta";

export interface EncryptedRecord {
  id: string;
  payload: string; // base64 ciphertext
  updatedAt: number;
}

export interface MetaRecord {
  id: string;
  value: string;
}

interface ZostajeDB extends DBSchema {
  transactions: { key: string; value: EncryptedRecord };
  kontrahenci: { key: string; value: EncryptedRecord };
  settings: { key: string; value: EncryptedRecord };
  projects: { key: string; value: EncryptedRecord };
  rules: { key: string; value: EncryptedRecord };
  audit_log: {
    key: string;
    value: EncryptedRecord;
    indexes: { "by-updatedAt": number };
  };
  meta: { key: string; value: MetaRecord };
}

let _dbPromise: Promise<IDBPDatabase<ZostajeDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ZostajeDB>> {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB nie jest dostępne po stronie serwera");
  }
  if (!_dbPromise) {
    _dbPromise = openDB<ZostajeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("transactions")) {
          db.createObjectStore("transactions", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("kontrahenci")) {
          db.createObjectStore("kontrahenci", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("audit_log")) {
          const store = db.createObjectStore("audit_log", { keyPath: "id" });
          store.createIndex("by-updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("projects")) {
          db.createObjectStore("projects", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("rules")) {
          db.createObjectStore("rules", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "id" });
        }
      },
    });
  }
  return _dbPromise;
}

// ─── Low-level encrypted record operations ─────────────────────────────────

type EncryptedStore = Exclude<StoreName, "meta">;

export async function getAll(store: EncryptedStore): Promise<EncryptedRecord[]> {
  const db = await getDB();
  return db.getAll(store);
}

export async function getById(
  store: EncryptedStore,
  id: string
): Promise<EncryptedRecord | undefined> {
  const db = await getDB();
  return db.get(store, id);
}

export async function add(store: EncryptedStore, record: EncryptedRecord): Promise<void> {
  const db = await getDB();
  await db.add(store, record);
}

export async function update(store: EncryptedStore, record: EncryptedRecord): Promise<void> {
  const db = await getDB();
  await db.put(store, record);
}

export async function remove(store: EncryptedStore, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

export async function clearStore(store: EncryptedStore): Promise<void> {
  const db = await getDB();
  await db.clear(store);
}

// ─── Meta store (plaintext verification + schema markers) ──────────────────

export async function getMeta(id: string): Promise<string | undefined> {
  const db = await getDB();
  const record = await db.get("meta", id);
  return record?.value;
}

export async function setMeta(id: string, value: string): Promise<void> {
  const db = await getDB();
  await db.put("meta", { id, value });
}

export async function hasAnyData(): Promise<boolean> {
  const db = await getDB();
  const count =
    (await db.count("transactions")) +
    (await db.count("kontrahenci")) +
    (await db.count("settings"));
  return count > 0 || (await db.count("meta")) > 0;
}

export const db = {
  getAll,
  getById,
  add,
  update,
  remove,
  clearStore,
  getMeta,
  setMeta,
  hasAnyData,
};
