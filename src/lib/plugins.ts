/**
 * Minimal plugin hook system.
 *
 * Plugins register handlers against a named hook. Core modules emit
 * hooks via `runHook(name, payload)`. Each handler runs in its own
 * try/catch — a thrown plugin NEVER breaks the host. Errors are
 * reported via the optional logger (defaults to console.error).
 *
 * Handlers run in insertion order. Each handler can transform the payload
 * by returning a new value — the return value is piped into the next
 * handler. Handlers that return `undefined` leave the payload unchanged.
 *
 * This is infrastructure. There is no marketplace, no sandboxing, no
 * permission model. Plugins are trusted code bundled with the app.
 */

export type PluginHook =
  | "transaction:before-save"
  | "transaction:after-save"
  | "transaction:before-delete"
  | "import:after-csv"
  | "report:render";

export type PluginHandler = (payload: unknown) => unknown | Promise<unknown>;

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  core?: boolean; // disabling a core plugin is discouraged
  hooks: Partial<Record<PluginHook, PluginHandler>>;
}

interface RegistryEntry {
  plugin: Plugin;
  enabled: boolean;
}

const registry: RegistryEntry[] = [];

let logger: (err: unknown, pluginId: string, hook: PluginHook) => void = (
  err,
  pluginId,
  hook
) => {
  // eslint-disable-next-line no-console
  console.error(`[plugin:${pluginId}] hook "${hook}" failed:`, err);
};

export function setPluginErrorLogger(
  fn: (err: unknown, pluginId: string, hook: PluginHook) => void
): void {
  logger = fn;
}

export function registerPlugin(plugin: Plugin): void {
  const existing = registry.findIndex((e) => e.plugin.id === plugin.id);
  if (existing >= 0) {
    registry[existing] = { plugin, enabled: registry[existing].enabled };
  } else {
    registry.push({ plugin, enabled: true });
  }
}

export function unregisterPlugin(id: string): void {
  const idx = registry.findIndex((e) => e.plugin.id === id);
  if (idx >= 0) registry.splice(idx, 1);
}

export function setPluginEnabled(id: string, enabled: boolean): void {
  const entry = registry.find((e) => e.plugin.id === id);
  if (entry) entry.enabled = enabled;
}

export function isPluginEnabled(id: string): boolean {
  return registry.find((e) => e.plugin.id === id)?.enabled ?? false;
}

export function listPlugins(): Array<{ plugin: Plugin; enabled: boolean }> {
  return registry.map((e) => ({ plugin: e.plugin, enabled: e.enabled }));
}

/**
 * Run all enabled handlers registered for `hook`. Errors from individual
 * plugins are caught and logged — the pipeline continues with the payload
 * unchanged for the failing handler.
 */
export async function runHook<T = unknown>(hook: PluginHook, payload: T): Promise<T> {
  let current: unknown = payload;
  for (const entry of registry) {
    if (!entry.enabled) continue;
    const handler = entry.plugin.hooks[hook];
    if (!handler) continue;
    try {
      const next = await handler(current);
      if (next !== undefined) current = next;
    } catch (err) {
      logger(err, entry.plugin.id, hook);
      // swallow — never break the host on plugin failure
    }
  }
  return current as T;
}

// ─── Manifest + sandboxed context (community plugins) ──────────────────────
//
// Bundled plugins (rules, audit, sync) import storage directly — they are
// trusted. Community plugins loaded at runtime must NEVER touch raw
// IndexedDB or the keystore. They receive a PluginContext produced by
// `createPluginContext(manifest)` which filters access by the permissions
// declared in their manifest. Requesting a permission not listed below
// makes `createPluginContext` throw, which prevents install.

export type PluginPermission =
  | "read:transactions"
  | "read:kontrahenci"
  | "read:projects"
  | "read:rules"
  | "write:transactions"
  | "write:kontrahenci"
  | "write:projects"
  | "ui:sidebar"
  | "ui:command-palette";

export const PERMISSION_LABELS: Record<PluginPermission, string> = {
  "read:transactions": "Odczyt transakcji",
  "read:kontrahenci": "Odczyt kontrahentów",
  "read:projects": "Odczyt projektów",
  "read:rules": "Odczyt reguł",
  "write:transactions": "Zapis transakcji",
  "write:kontrahenci": "Zapis kontrahentów",
  "write:projects": "Zapis projektów",
  "ui:sidebar": "Dodawanie elementów do sidebara",
  "ui:command-palette": "Dodawanie komend do palety poleceń",
};

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  hooks: PluginHook[];
  permissions: PluginPermission[];
}

export interface PluginContext {
  manifest: PluginManifest;
  data: {
    listTransactions?: () => Promise<unknown[]>;
    listKontrahenci?: () => Promise<unknown[]>;
    listProjects?: () => Promise<unknown[]>;
    listRules?: () => Promise<unknown[]>;
    addTransaction?: (draft: unknown) => Promise<unknown>;
    updateTransaction?: (id: string, patch: unknown) => Promise<unknown>;
    addKontrahent?: (draft: unknown) => Promise<unknown>;
    addProject?: (draft: unknown) => Promise<unknown>;
  };
  ui: {
    addSidebarItem?: (item: { href: string; label: string }) => void;
    addCommand?: (cmd: { id: string; label: string; run: () => void }) => void;
  };
  log: (...args: unknown[]) => void;
}

function assertKnownPermission(p: string): asserts p is PluginPermission {
  if (!(p in PERMISSION_LABELS)) {
    throw new Error(`Nieznane uprawnienie pluginu: ${p}`);
  }
}

export function validateManifest(raw: unknown): PluginManifest {
  if (!raw || typeof raw !== "object") throw new Error("Manifest pluginu musi być obiektem");
  const m = raw as Record<string, unknown>;
  const required = ["id", "name", "version", "hooks", "permissions"] as const;
  for (const k of required) {
    if (!(k in m)) throw new Error(`Manifest: brak pola "${k}"`);
  }
  if (typeof m.id !== "string" || !m.id.trim()) throw new Error('Manifest: "id" musi być niepustym stringiem');
  if (typeof m.name !== "string") throw new Error('Manifest: "name" musi być stringiem');
  if (typeof m.version !== "string") throw new Error('Manifest: "version" musi być stringiem');
  if (!Array.isArray(m.hooks)) throw new Error('Manifest: "hooks" musi być tablicą');
  if (!Array.isArray(m.permissions)) throw new Error('Manifest: "permissions" musi być tablicą');
  for (const p of m.permissions as unknown[]) {
    if (typeof p !== "string") throw new Error("Manifest: uprawnienia muszą być stringami");
    assertKnownPermission(p);
  }
  return {
    id: m.id,
    name: m.name as string,
    version: m.version as string,
    author: typeof m.author === "string" ? m.author : undefined,
    description: typeof m.description === "string" ? m.description : undefined,
    hooks: m.hooks as PluginHook[],
    permissions: m.permissions as PluginPermission[],
  };
}

// UI sinks — populated by the host app. Community plugins push into these.
const sidebarExtras: Array<{ href: string; label: string; pluginId: string }> = [];
const commandExtras: Array<{ id: string; label: string; run: () => void; pluginId: string }> = [];

export function listSidebarExtras(): ReadonlyArray<{ href: string; label: string; pluginId: string }> {
  return sidebarExtras;
}
export function listCommandExtras(): ReadonlyArray<{ id: string; label: string; run: () => void; pluginId: string }> {
  return commandExtras;
}

/**
 * Build a sandboxed context for a community plugin. The returned object
 * only exposes accessors whose permission is in `manifest.permissions`.
 * The plugin never sees raw IndexedDB, the crypto key, or other plugins.
 *
 * `storageApi` is injected so this module stays free of circular imports
 * with `storage.ts`. In practice the install flow passes `storage` from
 * `@/lib/storage`.
 */
export function createPluginContext(
  manifest: PluginManifest,
  storageApi: {
    getAll: (entity: "transaction" | "kontrahent" | "project" | "rule") => Promise<Array<{ id: string; data: unknown }>>;
    add: (entity: "transaction" | "kontrahent" | "project", data: unknown) => Promise<unknown>;
    update: (entity: "transaction", id: string, patch: unknown) => Promise<unknown>;
  }
): PluginContext {
  // Validate up-front — any unknown permission throws before the plugin runs.
  for (const p of manifest.permissions) assertKnownPermission(p);

  const has = (p: PluginPermission) => manifest.permissions.includes(p);
  const unwrap = async (entity: "transaction" | "kontrahent" | "project" | "rule") =>
    (await storageApi.getAll(entity)).map((r) => r.data);

  const ctx: PluginContext = {
    manifest,
    data: {
      ...(has("read:transactions") && { listTransactions: () => unwrap("transaction") }),
      ...(has("read:kontrahenci") && { listKontrahenci: () => unwrap("kontrahent") }),
      ...(has("read:projects") && { listProjects: () => unwrap("project") }),
      ...(has("read:rules") && { listRules: () => unwrap("rule") }),
      ...(has("write:transactions") && {
        addTransaction: (draft: unknown) => storageApi.add("transaction", draft),
        updateTransaction: (id: string, patch: unknown) => storageApi.update("transaction", id, patch),
      }),
      ...(has("write:kontrahenci") && {
        addKontrahent: (draft: unknown) => storageApi.add("kontrahent", draft),
      }),
      ...(has("write:projects") && {
        addProject: (draft: unknown) => storageApi.add("project", draft),
      }),
    },
    ui: {
      ...(has("ui:sidebar") && {
        addSidebarItem: (item) => {
          sidebarExtras.push({ ...item, pluginId: manifest.id });
        },
      }),
      ...(has("ui:command-palette") && {
        addCommand: (cmd) => {
          commandExtras.push({ ...cmd, pluginId: manifest.id });
        },
      }),
    },
    log: (...args) => {
      // eslint-disable-next-line no-console
      console.log(`[plugin:${manifest.id}]`, ...args);
    },
  };

  return ctx;
}
