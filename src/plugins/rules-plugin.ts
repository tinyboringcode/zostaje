/**
 * rules-plugin — applies user rules to transaction drafts before save.
 *
 * Subscribes to `transaction:before-save`. Reads rules from the vault
 * each time a transaction is saved so new rules take effect immediately.
 * Increments `match_count` on rules that matched (best-effort — wrapped
 * in try/catch so a failed update doesn't block the save).
 */

import type { Plugin } from "@/lib/plugins";
import { applyRules } from "@/lib/rules";
import { storage, type TransactionSavePayload } from "@/lib/storage";
import type { Rule } from "@/lib/types";

export const rulesPlugin: Plugin = {
  id: "core.rules",
  name: "Reguły automatyczne",
  version: "1.0.0",
  description: "Automatyczna kategoryzacja transakcji według reguł użytkownika.",
  core: true,
  hooks: {
    "transaction:before-save": async (payload) => {
      const p = payload as TransactionSavePayload;
      const stored = await storage.getAll<Rule>("rule");
      const rules = stored.map((s) => ({ ...s.data }));
      const matched: Array<{ id: string; rule: Rule }> = [];

      const next = applyRules(p.draft, rules, {
        onMatch: (rule) => {
          const envelope = stored.find((s) => s.data.name === rule.name);
          if (envelope) matched.push({ id: envelope.id, rule });
        },
      });

      // Increment match_count best-effort.
      for (const m of matched) {
        try {
          await storage.update<Rule>("rule", m.id, (prev) => ({
            ...prev,
            match_count: (prev.match_count ?? 0) + 1,
          }));
        } catch {
          // ignore — rule counter is nice-to-have, never blocks save
        }
      }

      return { ...p, draft: next };
    },
  },
};
