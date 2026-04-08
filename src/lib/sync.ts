/**
 * End-to-end encrypted sync (Pro feature).
 *
 * Architecture: the client encrypts the entire vault payload with the
 * session key (held in `keystore`), POSTs the ciphertext to `/api/sync`,
 * and the server stores it as an opaque blob. `pullSync` does the
 * reverse. The server NEVER sees plaintext and holds no key material.
 *
 * Merge strategy on pull: last-write-wins per record by `updatedAt`.
 *
 * This file does not import crypto.ts / keystore.ts directly for
 * encryption — it calls through `storage.ts` (`snapshot`) and the same
 * primitives used by phase-1 export. Keys are passed in from the caller
 * to keep this module pure on the auth dimension.
 */

import { encrypt, decrypt } from "./crypto";
import { keystore } from "./keystore";
import { storage, type PlainSnapshot, type StoredEntity, type EntityType } from "./storage";

const LS_VERSION_KEY = "zostaje.sync.version";
const LS_LAST_SYNC_KEY = "zostaje.sync.lastAt";
const LS_DEVICE_KEY = "zostaje.sync.deviceId";
const LS_STATUS_KEY = "zostaje.sync.status"; // "idle" | "syncing" | "ok" | "error"
const LS_ERROR_KEY = "zostaje.sync.error";

export type SyncStatus = "idle" | "syncing" | "ok" | "error";

// ── Local state helpers ───────────────────────────────────────────────────

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(LS_DEVICE_KEY);
  if (!id) {
    id =
      "device-" +
      (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
    localStorage.setItem(LS_DEVICE_KEY, id);
  }
  return id;
}

function getLocalVersion(): number {
  if (typeof window === "undefined") return 0;
  const v = localStorage.getItem(LS_VERSION_KEY);
  return v ? Number(v) : 0;
}

function setLocalVersion(v: number): void {
  localStorage.setItem(LS_VERSION_KEY, String(v));
  localStorage.setItem(LS_LAST_SYNC_KEY, new Date().toISOString());
}

function setStatus(s: SyncStatus, error?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_STATUS_KEY, s);
  if (error) localStorage.setItem(LS_ERROR_KEY, error);
  else localStorage.removeItem(LS_ERROR_KEY);
  window.dispatchEvent(new CustomEvent("zostaje:sync-status", { detail: { status: s, error } }));
}

export function readSyncStatus(): { status: SyncStatus; lastAt: string | null; error: string | null } {
  if (typeof window === "undefined") return { status: "idle", lastAt: null, error: null };
  return {
    status: (localStorage.getItem(LS_STATUS_KEY) as SyncStatus) || "idle",
    lastAt: localStorage.getItem(LS_LAST_SYNC_KEY),
    error: localStorage.getItem(LS_ERROR_KEY),
  };
}

// ── Push ──────────────────────────────────────────────────────────────────

export async function pushSync(key?: CryptoKey): Promise<void> {
  const k = key ?? keystore.getKey();
  setStatus("syncing");
  try {
    const snap = await storage.snapshot();
    const blob = await encrypt(snap, k);
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blob,
        device_id: getDeviceId(),
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const body = (await res.json()) as { version: number };
    setLocalVersion(body.version);
    setStatus("ok");
  } catch (err) {
    setStatus("error", (err as Error).message);
    throw err;
  }
}

// ── Pull ──────────────────────────────────────────────────────────────────

type RemoteSnapshot = PlainSnapshot;

export async function pullSync(key?: CryptoKey): Promise<void> {
  const k = key ?? keystore.getKey();
  setStatus("syncing");
  try {
    const since = getLocalVersion();
    const res = await fetch(`/api/sync?since=${since}`, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    const body = (await res.json()) as
      | { up_to_date: true }
      | { blob: string; version: number };

    if ("up_to_date" in body) {
      setStatus("ok");
      return;
    }

    const snapshot = (await decrypt(body.blob, k)) as RemoteSnapshot;
    await mergeLastWriteWins(snapshot);
    setLocalVersion(body.version);
    setStatus("ok");
  } catch (err) {
    setStatus("error", (err as Error).message);
    throw err;
  }
}

async function mergeLastWriteWins(remote: RemoteSnapshot): Promise<void> {
  const merge = async (entity: EntityType, items: StoredEntity[] | undefined) => {
    if (!items) return;
    for (const incoming of items) {
      const existing = await storage.getById(entity, incoming.id);
      if (!existing || (incoming.updatedAt ?? 0) > (existing.updatedAt ?? 0)) {
        if (existing) {
          await storage.update(entity, incoming.id, incoming.data as never);
        } else {
          await storage.add(entity, incoming.data, { id: incoming.id });
        }
      }
    }
  };
  await merge("transaction", remote.transactions);
  await merge("kontrahent", remote.kontrahenci);
  await merge("setting", remote.settings);
  await merge("project", remote.projects);
  await merge("rule", remote.rules);
}

// ── Auto-sync orchestration ───────────────────────────────────────────────

let _pushDebounce: ReturnType<typeof setTimeout> | null = null;

export function scheduleAutoPush(delayMs = 2000): void {
  if (_pushDebounce) clearTimeout(_pushDebounce);
  _pushDebounce = setTimeout(() => {
    pushSync().catch(() => {
      // status already set to error by pushSync
    });
  }, delayMs);
}

export async function autoSync(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  try {
    await pullSync();
  } catch {
    // stay offline-friendly
  }
}
