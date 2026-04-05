"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  listPlugins,
  setPluginEnabled,
  validateManifest,
  PERMISSION_LABELS,
  type Plugin,
  type PluginHook,
  type PluginManifest,
} from "@/lib/plugins";
import { bootstrapPlugins } from "@/plugins";

interface Row {
  plugin: Plugin;
  enabled: boolean;
}

export function PluginsSection() {
  const [rows, setRows] = React.useState<Row[]>([]);
  const [pending, setPending] = React.useState<PluginManifest | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const refresh = React.useCallback(() => {
    setRows(listPlugins());
  }, []);

  React.useEffect(() => {
    bootstrapPlugins()
      .catch(() => {})
      .finally(refresh);
  }, [refresh]);

  function toggle(p: Plugin, nextEnabled: boolean) {
    if (p.core && !nextEnabled) {
      if (
        !confirm(
          `"${p.name}" to plugin wbudowany. Wyłączenie go przerwie działanie kluczowych funkcji. Kontynuować?`
        )
      ) {
        return;
      }
    }
    setPluginEnabled(p.id, nextEnabled);
    refresh();
    toast.success(`${p.name}: ${nextEnabled ? "włączony" : "wyłączony"}`);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const manifest = validateManifest(raw);
      setPending(manifest);
    } catch (err) {
      toast.error(`Nieprawidłowy manifest: ${(err as Error).message}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmInstall() {
    if (!pending) return;
    // Community plugin runtime-loading is not yet wired to a code fetch —
    // we register the manifest shell so the user can see it listed and the
    // host knows about its declared hooks/permissions. Executing untrusted
    // JS will ship in a later release behind an explicit opt-in.
    const { registerPlugin } = await import("@/lib/plugins");
    registerPlugin({
      id: pending.id,
      name: pending.name,
      version: pending.version,
      description: pending.description,
      core: false,
      hooks: Object.fromEntries(pending.hooks.map((h) => [h, () => undefined])) as Plugin["hooks"],
    });
    toast.success(`Plugin "${pending.name}" zainstalowany`);
    setPending(null);
    refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pluginy</CardTitle>
        <CardDescription>
          Pluginy rozszerzają działanie skarbca poprzez hooki. Wbudowane pluginy obsługują reguły, audyt i sync.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak zarejestrowanych pluginów.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map(({ plugin, enabled }) => {
              const hooks = Object.keys(plugin.hooks) as PluginHook[];
              return (
                <li key={plugin.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{plugin.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        v{plugin.version}
                      </span>
                      {plugin.core && (
                        <span className="text-[10px] uppercase tracking-wide text-primary">
                          core
                        </span>
                      )}
                    </div>
                    {plugin.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{plugin.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                      {hooks.join(" · ") || "— brak hooków —"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={enabled ? "outline" : "default"}
                    onClick={() => toggle(plugin, !enabled)}
                  >
                    {enabled ? "Wyłącz" : "Włącz"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Zainstaluj plugin społeczności z pliku <code>manifest.json</code>.
            </div>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              Zainstaluj plugin
            </Button>
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            Zewnętrzne pluginy nie są weryfikowane przez zostaje. Instaluj tylko z zaufanych źródeł.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onFile}
          />
        </div>
      </CardContent>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-background border border-border shadow-xl p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold">Zainstalować plugin?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {pending.name} <span className="font-mono">v{pending.version}</span>
                {pending.author && ` · ${pending.author}`}
              </p>
            </div>
            {pending.description && (
              <p className="text-sm">{pending.description}</p>
            )}
            <div>
              <p className="text-xs font-medium mb-2">Ten plugin chce:</p>
              <ul className="text-sm space-y-1">
                {pending.permissions.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {PERMISSION_LABELS[p] ?? p}
                  </li>
                ))}
                {pending.hooks.length > 0 && (
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Reagować na zdarzenia: <code className="text-[11px]">{pending.hooks.join(", ")}</code>
                  </li>
                )}
              </ul>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Zewnętrzne pluginy nie są weryfikowane przez zostaje.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={() => setPending(null)}>
                Anuluj
              </Button>
              <Button size="sm" onClick={confirmInstall}>
                Zainstaluj
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
