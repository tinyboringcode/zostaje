"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  color: string;
  emoji: string;
  type: string;
  isDefault: boolean;
}

const PRESET_COLORS = ["#3b82f6","#8b5cf6","#06b6d4","#f59e0b","#6b7280","#ef4444","#f97316","#10b981","#22c55e","#84cc16","#ec4899","#14b8a6"];
const PRESET_EMOJIS = ["💻","🖥️","📱","📣","🏢","🏛️","🚗","📚","💸","💰","📈","🛒","🎯","🔧","📦","🌐","✈️","🍕","📊","🎨"];

export function CategoriesClient() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", emoji: "📁", color: "#6366f1", type: "EXPENSE" });

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategoria dodana");
      setForm({ name: "", emoji: "📁", color: "#6366f1", type: "EXPENSE" });
    },
    onError: () => toast.error("Błąd podczas dodawania kategorii"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kategoria usunięta");
    },
  });

  const income = categories?.filter((c) => c.type === "INCOME") ?? [];
  const expense = categories?.filter((c) => c.type === "EXPENSE") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kategorie</h1>

      {/* Add form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dodaj kategorię</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Nazwa</Label>
              <Input
                placeholder="np. Konferencje"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Typ</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Wydatek</SelectItem>
                  <SelectItem value="INCOME">Przychód</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                  className={`text-xl p-1.5 rounded-md transition-colors ${form.emoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Kolor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? "scale-125 ring-2 ring-offset-2 ring-foreground" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {/* Preview */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Podgląd:</span>
            <span
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
              style={{ backgroundColor: form.color + "22", color: form.color }}
            >
              {form.emoji} {form.name || "Kategoria"}
            </span>
          </div>
          <Button onClick={() => form.name && addMutation.mutate()} disabled={!form.name || addMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj kategorię
          </Button>
        </CardContent>
      </Card>

      {/* Category lists */}
      {isLoading ? (
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[{ label: "Wydatki", items: expense }, { label: "Przychody", items: income }].map(({ label, items }) => (
            <Card key={label}>
              <CardHeader><CardTitle className="text-base">{label}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {items.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1">
                    <span
                      className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: c.color + "22", color: c.color }}
                    >
                      {c.emoji} {c.name}
                    </span>
                    <div className="flex items-center gap-2">
                      {c.isDefault && <Badge variant="outline" className="text-xs">domyślna</Badge>}
                      {!c.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground">Brak kategorii</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
