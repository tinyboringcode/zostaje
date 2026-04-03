"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Sparkles, Building2, Settings2, ExternalLink, Zap, FolderOpen, Bell, RefreshCw, CheckCircle2, Mail, FileText, Receipt, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const TAX_FORMS = [
  { value: "flat_rate", label: "Ryczałt" },
  { value: "linear", label: "Liniowy 19%" },
  { value: "tax_scale", label: "Skala podatkowa" },
];

interface Settings {
  id: number;
  companyName: string;
  nip: string;
  taxForm: string;
  isVatPayer: boolean;
  address: string;
  currency: string;
  fiscalYearStart: number;
  ollamaUrl: string;
  ollamaModel: string;
  ollamaEnabled: boolean;
  onboardingCompleted: boolean;
  notificationEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpEnabled: boolean;
  budgetAlertEnabled: boolean;
  budgetAlertThreshold: number;
  notifyInterval: string;
  digestEnabled: boolean;
  digestFrequency: string;
  digestDays: number;
  invoiceTemplate: string;
  invoiceCounter: number;
  zusStage: string;
  vatPeriod: string;
  ryczaltRate: number;
  companyStartDate: string;
  ksefToken: string;
  ksefEnvironment: string;
  ksefEnabled: boolean;
  watchFolderPath: string;
  watchFolderEnabled: boolean;
}

export function SettingsClient() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data, isLoading } = useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const [form, setForm] = useState<Omit<Settings, "id" | "onboardingCompleted">>({
    companyName: "",
    nip: "",
    taxForm: "linear",
    isVatPayer: false,
    address: "",
    currency: "PLN",
    fiscalYearStart: 1,
    ollamaUrl: "http://localhost:11434",
    ollamaModel: "llama3.2",
    ollamaEnabled: false,
    ksefToken: "",
    ksefEnvironment: "test",
    ksefEnabled: false,
    watchFolderPath: "",
    watchFolderEnabled: false,
    notificationEmail: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpEnabled: false,
    budgetAlertEnabled: true,
    budgetAlertThreshold: 80,
    notifyInterval: "immediate",
    digestEnabled: false,
    digestFrequency: "weekly",
    digestDays: 7,
    invoiceTemplate: "FV/{YYYY}/{NNN}",
    invoiceCounter: 1,
    zusStage: "full",
    vatPeriod: "monthly",
    ryczaltRate: 12,
    companyStartDate: "",
  });

  useEffect(() => {
    if (data) {
      const { id: _id, onboardingCompleted: _oc, ...rest } = data; // eslint-disable-line @typescript-eslint/no-unused-vars
      setForm(rest);
    }
  }, [data]);

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, onboardingCompleted: true }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Ustawienia zapisane");
    },
  });

  const testEmail = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/test", { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => toast.success("E-mail testowy wysłany! Sprawdź skrzynkę."),
    onError: (e: Error) => toast.error(e.message),
  });

  const checkBudgets = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/check-budgets", { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.skipped) toast.info(`Pominięto: ${data.reason}`);
      else if (data.sent === 0) toast.success("Brak alertów — budżety w normie");
      else toast.success(`Wysłano ${data.sent} powiadomień`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendDigest = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.skipped) toast.info(`Pominięto: ${data.reason}`);
      else toast.success(`Raport wysłany! (${data.transactions} transakcji)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testOllama = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${form.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: (data) => {
      const models = data.models?.map((m: { name: string }) => m.name).join(", ") ?? "brak modeli";
      toast.success(`Połączono z Ollama! Modele: ${models}`);
    },
    onError: () => toast.error("Nie można połączyć z Ollama — sprawdź czy działa na podanym adresie"),
  });

  if (isLoading) return <div className="h-48 bg-muted animate-pulse rounded-lg" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Ustawienia</h1>

      {/* Company profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Profil firmy
          </CardTitle>
          <CardDescription>Dane widoczne w raportach i eksportach</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <Label>Nazwa firmy / imię i nazwisko</Label>
              <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>NIP</Label>
              <Input
                placeholder="10 cyfr"
                value={form.nip}
                onChange={(e) => set("nip", e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
            <div className="space-y-1">
              <Label>Waluta</Label>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="PLN">PLN — Polski złoty</option>
                <option value="EUR">EUR — Euro</option>
                <option value="USD">USD — Dolar</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Adres</Label>
              <Input
                placeholder="ul. Przykładowa 1, 00-001 Warszawa"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Forma opodatkowania</Label>
            <div className="flex gap-2 flex-wrap">
              {TAX_FORMS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set("taxForm", t.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                    form.taxForm === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
              form.isVatPayer ? "border-primary bg-primary/5" : "hover:bg-muted"
            )}
            onClick={() => set("isVatPayer", !form.isVatPayer)}
          >
            <div>
              <div className="text-sm font-medium">VAT-owiec</div>
              <div className="text-xs text-muted-foreground">Płacę podatek VAT</div>
            </div>
            <div className={cn(
              "w-4 h-4 rounded border-2 transition-colors",
              form.isVatPayer ? "bg-primary border-primary" : "border-muted-foreground"
            )} />
          </div>

          <div className="space-y-1">
            <Label>Początek roku podatkowego</Label>
            <select
              value={form.fiscalYearStart}
              onChange={(e) => set("fiscalYearStart", Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Intl.DateTimeFormat("pl-PL", { month: "long" }).format(new Date(2024, i, 1))}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ZUS & Tax settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-primary" /> ZUS i podatki
          </CardTitle>
          <CardDescription>Składki ZUS, etap preferencyjny, VAT i ryczałt</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <Label>Etap ZUS</Label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: "ulga_na_start", label: "Ulga na start" },
                  { value: "maly_zus", label: "Mały ZUS" },
                  { value: "maly_zus_plus", label: "Mały ZUS Plus" },
                  { value: "full", label: "Pełny ZUS" },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => set("zusStage", s.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                      form.zusStage === s.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ulga na start: 0 zł soc. przez 6 mies. · Mały ZUS: 24 mies. · Mały ZUS Plus: 36 mies.
              </p>
            </div>

            <div className="space-y-1">
              <Label>Data rozpoczęcia działalności</Label>
              <Input
                type="date"
                value={form.companyStartDate}
                onChange={(e) => set("companyStartDate", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Do obliczania pozostałego czasu na preferencyjny ZUS</p>
            </div>

            <div className="space-y-1">
              <Label>Stawka ryczałtu (%)</Label>
              <select
                value={form.ryczaltRate}
                onChange={(e) => set("ryczaltRate", Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {[2, 3, 5.5, 8.5, 12, 14, 15, 17].map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Używane tylko przy formie ryczałt</p>
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label>Okres rozliczenia VAT</Label>
              <div className="flex gap-2">
                {[
                  { value: "monthly", label: "Miesięczny (VAT-7)" },
                  { value: "quarterly", label: "Kwartalny (VAT-7K)" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => set("vatPeriod", p.value)}
                    className={cn(
                      "px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                      form.vatPeriod === p.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Tylko dla płatników VAT</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ollama AI */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" /> Lokalne AI (Ollama)
          </CardTitle>
          <CardDescription>
            Auto-kategoryzacja i analiza wydatków bez chmury — dane nie opuszczają Twojego serwera
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
              form.ollamaEnabled ? "border-primary bg-primary/5" : "hover:bg-muted"
            )}
            onClick={() => set("ollamaEnabled", !form.ollamaEnabled)}
          >
            <div>
              <div className="text-sm font-medium">Włącz lokalne AI</div>
              <div className="text-xs text-muted-foreground">Wymaga Ollama uruchomionej lokalnie</div>
            </div>
            <div className={cn(
              "w-4 h-4 rounded border-2 transition-colors",
              form.ollamaEnabled ? "bg-primary border-primary" : "border-muted-foreground"
            )} />
          </div>

          {form.ollamaEnabled && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>URL Ollama</Label>
                <Input
                  value={form.ollamaUrl}
                  onChange={(e) => set("ollamaUrl", e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </div>
              <div className="space-y-1">
                <Label>Model</Label>
                <Input
                  value={form.ollamaModel}
                  onChange={(e) => set("ollamaModel", e.target.value)}
                  placeholder="np. llama3.2, mistral, gemma2"
                />
                <p className="text-xs text-muted-foreground">
                  Polecane: <code className="bg-muted px-1 rounded">llama3.2</code>,{" "}
                  <code className="bg-muted px-1 rounded">mistral</code>,{" "}
                  <code className="bg-muted px-1 rounded">gemma2</code>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testOllama.mutate()}
                  disabled={testOllama.isPending}
                >
                  {testOllama.isPending ? "Testuję..." : "Testuj połączenie"}
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">
                    Pobierz Ollama <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KSeF */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-blue-500" /> KSeF — Krajowy System e-Faktur
          </CardTitle>
          <CardDescription>
            Automatyczny import faktur kosztowych z systemu MF. Wymaga tokenu autoryzacyjnego.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
              form.ksefEnabled ? "border-primary bg-primary/5" : "hover:bg-muted"
            )}
            onClick={() => set("ksefEnabled", !form.ksefEnabled)}
          >
            <div>
              <div className="text-sm font-medium">Włącz KSeF</div>
              <div className="text-xs text-muted-foreground">Wymaga tokenu z portalu podatnika</div>
            </div>
            <div className={cn(
              "w-4 h-4 rounded border-2 transition-colors",
              form.ksefEnabled ? "bg-primary border-primary" : "border-muted-foreground"
            )} />
          </div>

          {form.ksefEnabled && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Token autoryzacyjny KSeF</Label>
                <Input
                  type="password"
                  value={form.ksefToken}
                  onChange={(e) => set("ksefToken", e.target.value)}
                  placeholder="Wklej token z portalu KSeF"
                />
                <p className="text-xs text-muted-foreground">
                  Token pobierzesz w portalu podatnika na{" "}
                  <a href="https://ksef.mf.gov.pl" target="_blank" rel="noopener noreferrer" className="underline">
                    ksef.mf.gov.pl
                  </a>
                </p>
              </div>
              <div className="space-y-1">
                <Label>Środowisko</Label>
                <div className="flex gap-2">
                  {[{ value: "test", label: "Testowe (demo)" }, { value: "prod", label: "Produkcyjne" }].map((env) => (
                    <button
                      key={env.value}
                      type="button"
                      onClick={() => set("ksefEnvironment", env.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                        form.ksefEnvironment === env.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {env.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Watch Folder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpen className="h-4 w-4" /> Obserwowany folder
          </CardTitle>
          <CardDescription>
            Automatycznie wykrywa nowe pliki CSV w wybranym folderze (np. pobrania z banku).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
              form.watchFolderEnabled ? "border-primary bg-primary/5" : "hover:bg-muted"
            )}
            onClick={() => set("watchFolderEnabled", !form.watchFolderEnabled)}
          >
            <div>
              <div className="text-sm font-medium">Włącz obserwowany folder</div>
              <div className="text-xs text-muted-foreground">Sprawdza folder co 30 sekund w tle</div>
            </div>
            <div className={cn(
              "w-4 h-4 rounded border-2 transition-colors",
              form.watchFolderEnabled ? "bg-primary border-primary" : "border-muted-foreground"
            )} />
          </div>

          {form.watchFolderEnabled && (
            <div className="space-y-1">
              <Label>Ścieżka do folderu</Label>
              <Input
                value={form.watchFolderPath}
                onChange={(e) => set("watchFolderPath", e.target.value)}
                placeholder="/Users/jan/Downloads/wyciagi"
              />
              <p className="text-xs text-muted-foreground">
                Podaj pełną ścieżkę. Możesz tu wrzucać wyciągi z PKO, mBanku, Santandera.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-purple-500" /> Powiadomienia e-mail
          </CardTitle>
          <CardDescription>
            Alerty o przekroczeniu budżetu i przeterminowanych fakturach
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
              form.smtpEnabled ? "border-primary bg-primary/5" : "hover:bg-muted"
            )}
            onClick={() => set("smtpEnabled", !form.smtpEnabled)}
          >
            <div>
              <div className="text-sm font-medium">Włącz powiadomienia e-mail</div>
              <div className="text-xs text-muted-foreground">Wymaga konfiguracji SMTP</div>
            </div>
            <div className={cn(
              "w-4 h-4 rounded border-2 transition-colors",
              form.smtpEnabled ? "bg-primary border-primary" : "border-muted-foreground"
            )} />
          </div>

          {form.smtpEnabled && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Adres e-mail odbiorcy</Label>
                <Input
                  type="email"
                  placeholder="jan@firma.pl"
                  value={form.notificationEmail}
                  onChange={(e) => set("notificationEmail", e.target.value)}
                />
              </div>

              <Separator />
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Konfiguracja SMTP</Label>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Host SMTP</Label>
                  <Input
                    placeholder="smtp.gmail.com"
                    value={form.smtpHost}
                    onChange={(e) => set("smtpHost", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={form.smtpPort}
                    onChange={(e) => set("smtpPort", Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Użytkownik</Label>
                  <Input
                    placeholder="jan@gmail.com"
                    value={form.smtpUser}
                    onChange={(e) => set("smtpUser", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Hasło / App Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={form.smtpPass}
                    onChange={(e) => set("smtpPass", e.target.value)}
                  />
                </div>
              </div>

              <Separator />
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Ustawienia alertów</Label>

              <div className="space-y-2">
                <Label>Próg alertu budżetowego</Label>
                <div className="flex gap-2 flex-wrap">
                  {[70, 80, 90, 100].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set("budgetAlertThreshold", v)}
                      className={cn(
                        "px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                        form.budgetAlertThreshold === v
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Interwał sprawdzania</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "immediate", label: "Natychmiast" },
                    { value: "daily", label: "Raz dziennie" },
                    { value: "weekly", label: "Raz w tygodniu" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("notifyInterval", opt.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                        form.notifyInterval === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Interwał dotyczy sprawdzania budżetów — alerty o przeterminowanych fakturach zawsze trafiają natychmiast.
                </p>
              </div>

              <div className="flex gap-2 flex-wrap pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testEmail.mutate()}
                  disabled={testEmail.isPending || !form.notificationEmail}
                >
                  {testEmail.isPending
                    ? <><RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />Wysyłam...</>
                    : "Wyślij testowy e-mail"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkBudgets.mutate()}
                  disabled={checkBudgets.isPending}
                >
                  {checkBudgets.isPending
                    ? <><RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />Sprawdzam...</>
                    : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Sprawdź budżety teraz</>}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Numbering */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-indigo-500" /> Numeracja faktur
          </CardTitle>
          <CardDescription>
            Wewnętrzny szablon numerów faktur — stosowany automatycznie przy imporcie z KSeF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Gotowe szablony</Label>
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "FV/{YYYY}/{NNN}", value: "FV/{YYYY}/{NNN}" },
                { label: "{YYYY}/{MM}/{NNN}", value: "{YYYY}/{MM}/{NNN}" },
                { label: "FV-{YYYY}-{NNN}", value: "FV-{YYYY}-{NNN}" },
                { label: "{NNN}/{YYYY}", value: "{NNN}/{YYYY}" },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set("invoiceTemplate", t.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-sm font-mono font-medium transition-colors",
                    form.invoiceTemplate === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Własny szablon</Label>
            <Input
              value={form.invoiceTemplate}
              onChange={(e) => set("invoiceTemplate", e.target.value)}
              placeholder="FV/{YYYY}/{NNN}"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Zmienne: <code className="bg-muted px-1 rounded">{"{"+"YYYY"+"}"}</code> rok,{" "}
              <code className="bg-muted px-1 rounded">{"{"+"MM"+"}"}</code> miesiąc,{" "}
              <code className="bg-muted px-1 rounded">{"{"+"NNN"+"}"}</code> numer (auto-increment)
            </p>
            {form.invoiceTemplate && (
              <p className="text-xs text-primary font-medium mt-1">
                Podgląd:{" "}
                {form.invoiceTemplate
                  .replace("{YYYY}", new Date().getFullYear().toString())
                  .replace("{MM}", String(new Date().getMonth() + 1).padStart(2, "0"))
                  .replace("{NNN}", String(form.invoiceCounter).padStart(3, "0"))}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Aktualny licznik (następny numer)</Label>
            <Input
              type="number"
              min={1}
              value={form.invoiceCounter}
              onChange={(e) => set("invoiceCounter", Number(e.target.value))}
              className="max-w-[120px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Email Digest */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4 text-blue-500" /> Raport e-mail (digest)
          </CardTitle>
          <CardDescription>
            Automatyczne podsumowanie finansów — dziennie, tygodniowo lub miesięcznie
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
              form.digestEnabled ? "border-primary bg-primary/5" : "hover:bg-muted"
            )}
            onClick={() => set("digestEnabled", !form.digestEnabled)}
          >
            <div>
              <div className="text-sm font-medium">Włącz automatyczny raport</div>
              <div className="text-xs text-muted-foreground">Wysyłaj podsumowanie na e-mail odbiorcy</div>
            </div>
            <div className={cn(
              "w-4 h-4 rounded border-2 transition-colors",
              form.digestEnabled ? "bg-primary border-primary" : "border-muted-foreground"
            )} />
          </div>

          {form.digestEnabled && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Częstotliwość</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "daily", label: "Codziennie" },
                    { value: "weekly", label: "Co tydzień" },
                    { value: "monthly", label: "Co miesiąc" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("digestFrequency", opt.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                        form.digestFrequency === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Zakres danych</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 7, label: "7 dni" },
                    { value: 14, label: "14 dni" },
                    { value: 30, label: "30 dni" },
                    { value: 90, label: "3 miesiące" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("digestDays", opt.value)}
                      className={cn(
                        "px-3 py-1.5 rounded-md border text-sm font-medium transition-colors",
                        form.digestDays === opt.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Raport obejmuje transakcje z ostatnich {form.digestDays} dni
                </p>
              </div>
            </div>
          )}

          {form.smtpEnabled && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => sendDigest.mutate()}
                disabled={sendDigest.isPending || !form.notificationEmail}
              >
                {sendDigest.isPending
                  ? <><RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />Wysyłam raport...</>
                  : <><Mail className="h-3.5 w-3.5 mr-1" />Wyślij raport teraz</>}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" /> Informacje
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Wersja: 1.0.0</p>
          <p>Baza danych: SQLite (lokalny plik)</p>
          <p>Backup: skopiuj plik <code className="bg-muted px-1 rounded text-xs">dev.db</code></p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, onboardingCompleted: false }) })
                .then(() => { qc.invalidateQueries({ queryKey: ["settings"] }); router.push("/onboarding"); });
            }}
          >
            Uruchom ponownie onboarding
          </Button>
        </CardContent>
      </Card>

      {/* Backup */}
      <BackupSection />

      {/* Help & Tour */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HelpCircle className="h-4 w-4" /> Pomoc i przewodnik
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { localStorage.removeItem("tour-completed"); window.location.href = "/"; }}>
              🗺️ Uruchom przewodnik po aplikacji
            </Button>
            <Button variant="outline" asChild>
              <a href="/wiedza">📚 Otwórz bazę wiedzy</a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Przewodnik pokazuje wszystkie funkcje krok po kroku. Możesz go uruchomić ponownie w dowolnym momencie.</p>
        </CardContent>
      </Card>

      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full sm:w-auto">
        {mutation.isPending ? "Zapisuję..." : "Zapisz ustawienia"}
      </Button>
    </div>
  );
}

// ──────────────────────────────────────────
// Backup Section (self-contained component)
// ──────────────────────────────────────────
function BackupSection() {
  const [backupPath, setBackupPath] = useState("./backups");
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [dbSize, setDbSize] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/backup");
      const data = await res.json();
      setBackupPath(data.backupPath ?? "./backups");
      setLastBackup(data.lastBackupAt);
      setDbSize(data.dbSizeBytes ?? 0);
    } catch { /* ignore */ }
  };

  useEffect(() => { loadStatus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doBackup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Backup wykonany (${(data.sizeBytes / 1024).toFixed(0)} KB)`);
        loadStatus();
      } else {
        toast.error(data.error ?? "Backup nieudany");
      }
    } catch {
      toast.error("Nie udało się wykonać backupu");
    } finally {
      setLoading(false);
    }
  };

  const saveBackupPath = async () => {
    await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { path: backupPath } }),
    });
    toast.success("Ścieżka backupu zapisana");
  };

  const fmtSize = (bytes: number) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          💾 Backup danych
        </CardTitle>
        <CardDescription>
          Kopia pliku bazy danych SQLite. Faktury VAT należy przechowywać 5 lat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 text-sm text-muted-foreground flex-wrap">
          <span>Rozmiar bazy: <strong className="text-foreground">{fmtSize(dbSize)}</strong></span>
          {lastBackup && (
            <span>Ostatni backup: <strong className="text-foreground">
              {new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(lastBackup))}
            </strong></span>
          )}
          {!lastBackup && <span className="text-amber-600">Brak backupu — wykonaj pierwszy teraz</span>}
        </div>

        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label>Katalog backupów</Label>
            <Input
              value={backupPath}
              onChange={(e) => setBackupPath(e.target.value)}
              placeholder="./backups"
            />
            <p className="text-xs text-muted-foreground">Ścieżka względna (od katalogu projektu) lub absolutna</p>
          </div>
          <Button variant="outline" onClick={saveBackupPath}>Zapisz ścieżkę</Button>
        </div>

        <div className="flex gap-3">
          <Button onClick={doBackup} disabled={loading}>
            {loading ? "Tworzę backup..." : "💾 Wykonaj backup teraz"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
