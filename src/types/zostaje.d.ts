interface ZostajeVaultAPI {
  getPath(): Promise<string>;
  exists(): Promise<boolean>;
  save(data: string): Promise<{ ok: boolean; error?: string }>;
  load(): Promise<{ ok: boolean; data?: string; error?: string }>;
  getDataDir(): Promise<string>;
}

interface ZostajeGlobal {
  isDesktop: boolean;
  platform: string;
  version: string;
  vault?: ZostajeVaultAPI;
}

declare global {
  interface Window {
    zostaje?: ZostajeGlobal;
  }
}

export {};
