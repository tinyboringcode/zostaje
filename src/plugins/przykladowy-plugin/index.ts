/**
 * Przykładowy plugin community — pokazuje, jak używać sandboxed context.
 *
 * Ten plik NIE jest importowany przez host. Host wywołuje `register(ctx)`
 * po tym, jak użytkownik zaakceptował uprawnienia w dialogu instalacji.
 * Plugin dostaje jedynie `PluginContext` — nigdy raw IndexedDB ani klucza.
 */

import type { PluginContext } from "@/lib/plugins";

export async function register(ctx: PluginContext): Promise<void> {
  ctx.log("uruchomiony, permissions:", ctx.manifest.permissions);

  // Przykładowe użycie read:transactions — liczymy transakcje z tagiem.
  if (ctx.data.listTransactions) {
    const txs = (await ctx.data.listTransactions()) as Array<{ tags?: string[] }>;
    const big = txs.filter((t) => t.tags?.includes("duża-transakcja")).length;
    ctx.log(`Transakcje z tagiem #duża-transakcja: ${big}`);
  }
}
