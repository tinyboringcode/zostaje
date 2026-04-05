# Przykładowy plugin

Referencyjny plugin społeczności dla zostaje. Pokazuje minimalny kształt:
`manifest.json` + funkcja `register(ctx)`, która dostaje **sandboxed**
`PluginContext`.

## Struktura

```
przykladowy-plugin/
├── manifest.json   # id, wersja, hooki, uprawnienia
├── index.ts        # export async function register(ctx)
└── README.md
```

## Uprawnienia

Plugin może używać wyłącznie tego, co zadeklarował w `manifest.permissions`.
Jeśli w manifeście jest `read:transactions`, host wstrzyknie
`ctx.data.listTransactions`. Jeśli nie — pola po prostu nie będzie.
Plugin nie ma dostępu do IndexedDB, klucza szyfrowania ani innych pluginów.

Dostępne uprawnienia: `read:transactions`, `read:kontrahenci`,
`read:projects`, `read:rules`, `write:transactions`, `write:kontrahenci`,
`write:projects`, `ui:sidebar`, `ui:command-palette`.

## Instalacja

W Ustawieniach → Pluginy → **Zainstaluj plugin** wybierz plik `manifest.json`
(lub całe `.zip` z pluginem). Pojawi się dialog z listą żądanych uprawnień —
po zaakceptowaniu plugin zostaje zarejestrowany w bieżącej sesji.

> Zewnętrzne pluginy nie są weryfikowane przez zostaje.
> Instaluj tylko pluginy z zaufanych źródeł.
