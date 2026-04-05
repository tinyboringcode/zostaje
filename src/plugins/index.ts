/**
 * Bundled plugin registration. Called once after the vault is unlocked.
 * Safe to call multiple times — `registerPlugin` replaces existing entries.
 */

import { registerPlugin } from "@/lib/plugins";
import { storage } from "@/lib/storage";
import { starterRules } from "@/lib/rules";
import { auditPlugin } from "./audit-plugin";
import { rulesPlugin } from "./rules-plugin";
import { syncPlugin } from "./sync-plugin";
import type { Rule } from "@/lib/types";

let bootstrapped = false;

export async function bootstrapPlugins(): Promise<void> {
  if (bootstrapped) return;
  // Audit must run AFTER rules, so rule transformations are part of the
  // logged diff. Register order determines run order.
  registerPlugin(rulesPlugin);
  registerPlugin(auditPlugin);
  registerPlugin(syncPlugin);
  bootstrapped = true;

  // Seed starter rules on first unlock.
  try {
    const existing = await storage.getAll<Rule>("rule");
    if (existing.length === 0) {
      for (const r of starterRules()) {
        await storage.add<Rule>("rule", r);
      }
    }
  } catch {
    // Vault may not be ready yet — the caller retries after unlock.
  }
}
