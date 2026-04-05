/**
 * sync-plugin — schedules an encrypted push after every transaction mutation.
 *
 * Registered only when the Pro plan is active. Catches and logs its own
 * errors — a failed sync never breaks the save pipeline.
 */

import type { Plugin } from "@/lib/plugins";
import { scheduleAutoPush } from "@/lib/sync";
import { isPro } from "@/lib/pro";

export const syncPlugin: Plugin = {
  id: "core.sync",
  name: "Sync (Pro)",
  version: "1.0.0",
  description: "Szyfruje lokalne dane i synchronizuje z serwerem (tylko Pro).",
  core: false,
  hooks: {
    "transaction:after-save": () => {
      if (!isPro()) return;
      scheduleAutoPush();
    },
    "transaction:before-delete": () => {
      if (!isPro()) return;
      scheduleAutoPush();
    },
  },
};
