/**
 * Pro plan gate.
 *
 * Reads the plan from `/api/auth/me` on first call and caches the result
 * in sessionStorage. Never persists to localStorage — a plan downgrade
 * should take effect on next tab open without needing a flush.
 *
 * Feature flags are pure derivations of `isPro()` so call sites can
 * stay declarative.
 */

export type Plan = "free" | "pro";

const SESSION_KEY = "zostaje.plan";

let memoryCache: Plan | null = null;

/**
 * Read the plan from session cache or fall back to 'free'.
 * Synchronous — the source of truth is refreshed by `fetchPlan`.
 */
export function getPlan(): Plan {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return "free";
  const cached = sessionStorage.getItem(SESSION_KEY);
  if (cached === "pro" || cached === "free") {
    memoryCache = cached;
    return cached;
  }
  return "free";
}

export function isPro(): boolean {
  return getPlan() === "pro";
}

export function setPlan(plan: Plan): void {
  memoryCache = plan;
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SESSION_KEY, plan);
  }
}

/**
 * Hit the server to refresh the plan. Best-effort; stays `free` on error.
 */
export async function fetchPlan(): Promise<Plan> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return getPlan();
    const body = (await res.json()) as { plan?: Plan };
    if (body.plan === "pro" || body.plan === "free") {
      setPlan(body.plan);
      return body.plan;
    }
  } catch {
    // offline / error — keep current cache
  }
  return getPlan();
}

// ── Feature flags ─────────────────────────────────────────────────────────

export const features = {
  SYNC_ENABLED: () => isPro(),
  MOBILE_APP_LINK: () => isPro(),
  PRIORITY_SUPPORT: () => isPro(),
};

export const featureCopy: Record<string, { title: string; price: string }> = {
  sync: {
    title: "Sync między urządzeniami",
    price: "19 zł/mies",
  },
  mobile: {
    title: "Aplikacja mobilna",
    price: "19 zł/mies",
  },
  support: {
    title: "Priorytetowe wsparcie",
    price: "19 zł/mies",
  },
};
