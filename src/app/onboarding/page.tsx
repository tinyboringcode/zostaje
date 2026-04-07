"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { TrendingUp, Building2, Receipt, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TAX_FORMS = [
  {
    value: "flat_rate",
    label: "Ryczałt",
    description: "Stała stawka od przychodu (np. 12%, 8.5%)",
  },
  {
    value: "linear",
    label: "Podatek liniowy",
    description: "19% od dochodu, niezależnie od wysokości",
  },
  {
    value: "tax_scale",
    label: "Skala podatkowa",
    description: "12% do 120 tys. zł, 32% powyżej",
  },
];

const STEPS = [
  { id: 1, label: "Firma", icon: Building2 },
  { id: 2, label: "Podatki", icon: Receipt },
  { id: 3, label: "Gotowe", icon: CheckCircle2 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    companyName: "",
    nip: "",
    address: "",
    taxForm: "",
    isVatPayer: false,
    currency: "PLN",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, onboardingCompleted: true }),
      });
      if (!res.ok) throw new Error("Błąd zapisu");
    },
    onSuccess: () => router.push("/dashboard"),
    onError: () => toast.error("Nie udało się zapisać — spróbuj ponownie"),
  });

  const set = (key: string, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <TrendingUp className="h-7 w-7 text-primary" />
        <span className="text-xl font-bold">CashFlow JDG</span>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                done && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                active && "bg-primary text-primary-foreground",
                !done && !active && "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px w-6", step > s.id ? "bg-green-400" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {/* Step 1: Company info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Dane firmy</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Podstawowe informacje o Twojej działalności
                </p>
              </div>

              <div className="space-y-1">
                <Label>Nazwa firmy / imię i nazwisko *</Label>
                <Input
                  autoFocus
                  placeholder="np. Jan Kowalski"
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>NIP</Label>
                <Input
                  placeholder="np. 1234567890"
                  value={form.nip}
                  onChange={(e) => set("nip", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                />
              </div>

              <div className="space-y-1">
                <Label>Adres (opcjonalnie)</Label>
                <Input
                  placeholder="np. ul. Przykładowa 1, 00-001 Warszawa"
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Waluta</Label>
                <div className="flex gap-2">
                  {["PLN", "EUR", "USD"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => set("currency", c)}
                      className={cn(
                        "flex-1 py-2 rounded-md border text-sm font-medium transition-colors",
                        form.currency === c
                          ? "border-primary bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!form.companyName.trim()}
                onClick={() => setStep(2)}
              >
                Dalej →
              </Button>
            </div>
          )}

          {/* Step 2: Tax info */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Forma opodatkowania</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Pomaga w kategoryzacji i raportach podatkowych
                </p>
              </div>

              <div className="space-y-2">
                {TAX_FORMS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set("taxForm", t.value)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border transition-colors",
                      form.taxForm === t.value
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted border-border"
                    )}
                  >
                    <div className="font-medium text-sm">{t.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.description}</div>
                  </button>
                ))}
              </div>

              <div
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors",
                  form.isVatPayer ? "border-primary bg-primary/5" : "hover:bg-muted"
                )}
                onClick={() => set("isVatPayer", !form.isVatPayer)}
              >
                <div>
                  <div className="font-medium text-sm">Jestem VAT-owcem</div>
                  <div className="text-xs text-muted-foreground">Płacę podatek VAT</div>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                  form.isVatPayer ? "bg-primary border-primary" : "border-border"
                )}>
                  {form.isVatPayer && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  ← Wróć
                </Button>
                <Button
                  className="flex-1"
                  disabled={!form.taxForm}
                  onClick={() => setStep(3)}
                >
                  Dalej →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold">Wszystko gotowe!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Twój profil firmy jest skonfigurowany
                </p>
              </div>

              {/* Summary */}
              <div className="text-left space-y-2 bg-muted/50 rounded-lg p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Firma</span>
                  <span className="font-medium">{form.companyName}</span>
                </div>
                {form.nip && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NIP</span>
                    <span className="font-medium">{form.nip}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opodatkowanie</span>
                  <span className="font-medium">
                    {TAX_FORMS.find((t) => t.value === form.taxForm)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT</span>
                  <span className="font-medium">{form.isVatPayer ? "Tak" : "Nie"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waluta</span>
                  <span className="font-medium">{form.currency}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                  ← Wróć
                </Button>
                <Button
                  className="flex-1"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending ? "Zapisuję..." : "Przejdź do aplikacji →"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Wszystkie dane są przechowywane lokalnie na Twoim serwerze
      </p>
    </div>
  );
}
