/**
 * Electron preload script — exposes minimal API to the renderer.
 *
 * The renderer (Next.js) can check `window.zostaje.isDesktop` to know
 * it's running inside the Electron shell vs a regular browser.
 */

import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("zostaje", {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version ?? "0.1.0",
});
