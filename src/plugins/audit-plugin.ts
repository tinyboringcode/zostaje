/**
 * audit-plugin — logs every transaction mutation to the encrypted audit log.
 *
 * Before phase 2, `storage.ts` called `logChange` directly for every write.
 * That coupling is now broken for transactions: the core storage layer
 * emits plugin hooks and this plugin writes the audit entries.
 *
 * Non-transaction mutations (kontrahent / setting / project / rule) still
 * go through the direct `logChange` path in `storage.ts` — the hook surface
 * is intentionally small (see CLAUDE.md §Skarbiec lokalny).
 */

import type { Plugin } from "@/lib/plugins";
import { logChange } from "@/lib/audit";
import type { TransactionSavePayload, TransactionDeletePayload } from "@/lib/storage";

export const auditPlugin: Plugin = {
  id: "core.audit",
  name: "Audyt zmian",
  version: "1.0.0",
  description: "Zapisuje każdą zmianę transakcji do historii skarbca.",
  core: true,
  hooks: {
    "transaction:after-save": async (payload) => {
      const p = payload as TransactionSavePayload;
      await logChange(
        p.phase === "create" ? "create" : "update",
        "transaction",
        p.id,
        p.previous,
        p.draft
      );
    },
    "transaction:before-delete": async (payload) => {
      const p = payload as TransactionDeletePayload;
      await logChange("delete", "transaction", p.id, p.previous, null);
    },
  },
};
