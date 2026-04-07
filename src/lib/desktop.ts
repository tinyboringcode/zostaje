/**
 * Desktop detection — checks if we're running inside the Electron shell.
 * The preload script exposes `window.zostaje.isDesktop`.
 */

interface ZostajeDesktop {
  isDesktop: boolean;
  platform: string;
  version: string;
}

declare global {
  interface Window {
    zostaje?: ZostajeDesktop;
  }
}

export function isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  return window.zostaje?.isDesktop === true;
}

export function desktopPlatform(): string | null {
  if (typeof window === "undefined") return null;
  return window.zostaje?.platform ?? null;
}
