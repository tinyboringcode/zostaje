/**
 * Utilities for Electron vault file management.
 * These functions only work in the desktop app — they're no-ops in the browser.
 */

export function isDesktop(): boolean {
  return (
    typeof window !== "undefined" &&
    "zostaje" in window &&
    (window as Window & { zostaje?: { isDesktop?: boolean } }).zostaje?.isDesktop === true
  );
}

type ZostajeAPI = {
  isDesktop: boolean;
  platform: string;
  version: string;
  vault: {
    getPath(): Promise<string>;
    exists(): Promise<boolean>;
    save(data: string): Promise<{ ok: boolean; error?: string }>;
    load(): Promise<{ ok: boolean; data?: string; error?: string }>;
    getDataDir(): Promise<string>;
  };
};

function api(): ZostajeAPI | null {
  if (!isDesktop()) return null;
  return (window as Window & { zostaje?: ZostajeAPI }).zostaje ?? null;
}

export async function getVaultFilePath(): Promise<string | null> {
  return api()?.vault.getPath() ?? null;
}

export async function getVaultDataDir(): Promise<string | null> {
  return api()?.vault.getDataDir() ?? null;
}

export async function saveVaultToFile(data: string): Promise<boolean> {
  const result = await api()?.vault.save(data);
  return result?.ok === true;
}

export async function loadVaultFromFile(): Promise<string | null> {
  const result = await api()?.vault.load();
  if (result?.ok && result.data) return result.data;
  return null;
}

export async function vaultFileExists(): Promise<boolean> {
  return (await api()?.vault.exists()) === true;
}
