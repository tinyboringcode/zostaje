/**
 * Electron preload script — exposes minimal API to the renderer.
 *
 * The renderer (Next.js) can check `window.zostaje.isDesktop` to know
 * it's running inside the Electron shell vs a regular browser.
 */

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("zostaje", {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version ?? "0.1.0",
  vault: {
    getPath: (): Promise<string> => ipcRenderer.invoke("vault:get-path"),
    exists: (): Promise<boolean> => ipcRenderer.invoke("vault:exists"),
    save: (data: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke("vault:save", data),
    load: (): Promise<{ ok: boolean; data?: string; error?: string }> =>
      ipcRenderer.invoke("vault:load"),
    getDataDir: (): Promise<string> => ipcRenderer.invoke("vault:get-data-dir"),
  },
});
