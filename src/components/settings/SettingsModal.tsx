"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  Calculator,
  FileText,
  Sparkles,
  Bell,
  Shield,
  Zap,
  Monitor,
  X,
} from "lucide-react";

// ── Settings Modal Context ───────────────────────────────────────────────

interface SettingsModalContextValue {
  isOpen: boolean;
  activeCategory: string;
  open: (category?: string) => void;
  close: () => void;
  setCategory: (id: string) => void;
}

const SettingsModalContext = createContext<SettingsModalContextValue>({
  isOpen: false,
  activeCategory: "company",
  open: () => {},
  close: () => {},
  setCategory: () => {},
});

export function useSettingsModal() {
  return useContext(SettingsModalContext);
}

export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState("company");

  const open = useCallback((category?: string) => {
    if (category) setActiveCategory(category);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);
  const setCategory = useCallback((id: string) => setActiveCategory(id), []);

  // Listen for custom event to open settings from Command Palette
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      open(detail?.category);
    };
    window.addEventListener("zostaje:open-settings", handler);
    return () => window.removeEventListener("zostaje:open-settings", handler);
  }, [open]);

  return (
    <SettingsModalContext.Provider value={{ isOpen, activeCategory, open, close, setCategory }}>
      {children}
      <SettingsModal />
    </SettingsModalContext.Provider>
  );
}

// ── Categories ───────────────────────────────────────────────────────────

interface SettingsCategory {
  id: string;
  label: string;
  icon: React.ElementType;
}

const CATEGORIES: SettingsCategory[] = [
  { id: "company",       label: "Profil firmy",     icon: Building2 },
  { id: "tax",           label: "Podatki i ZUS",    icon: Calculator },
  { id: "invoices",      label: "Faktury",          icon: FileText },
  { id: "ai",            label: "AI / Ollama",      icon: Sparkles },
  { id: "notifications", label: "Powiadomienia",    icon: Bell },
  { id: "vault",         label: "Skarbiec",         icon: Shield },
  { id: "plugins",       label: "Wtyczki",          icon: Zap },
  { id: "app",           label: "Aplikacja",        icon: Monitor },
];

// ── Modal ────────────────────────────────────────────────────────────────

function SettingsModal() {
  const { isOpen, activeCategory, close, setCategory } = useSettingsModal();

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 820,
              maxHeight: "min(720px, 85vh)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
              display: "flex",
              overflow: "hidden",
            }}
          >
            {/* ── Left sidebar ───────────────────────────── */}
            <div
              className="hidden sm:flex"
              style={{
                width: 200,
                flexShrink: 0,
                borderRight: "1px solid var(--border)",
                background: "var(--surface)",
                flexDirection: "column",
                padding: "16px 8px",
                overflowY: "auto",
                gap: 2,
              }}
            >
              {CATEGORIES.map((cat) => {
                const active = cat.id === activeCategory;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 7,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      fontWeight: active ? 500 : 400,
                      background: active ? "var(--bg)" : "transparent",
                      color: active ? "var(--text-1)" : "var(--text-2)",
                      boxShadow: active ? "var(--shadow-sm)" : "none",
                      transition: "all 120ms ease",
                      width: "100%",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <Icon size={15} style={{ flexShrink: 0, opacity: active ? 1 : 0.6 }} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* ── Mobile category selector ───────────────── */}
            <div className="sm:hidden" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 1, background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", overflowX: "auto", padding: "8px 12px", gap: 4 }}>
                {CATEGORIES.map((cat) => {
                  const active = cat.id === activeCategory;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      style={{
                        padding: "6px 12px", borderRadius: 6, border: "1px solid",
                        fontFamily: "var(--font-sans)", fontSize: 11, cursor: "pointer",
                        background: active ? "var(--text-1)" : "transparent",
                        borderColor: active ? "var(--text-1)" : "var(--border)",
                        color: active ? "var(--bg)" : "var(--text-2)",
                        whiteSpace: "nowrap", flexShrink: 0,
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Right content ──────────────────────────── */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
                <h2 style={{ margin: 0, fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 600, color: "var(--text-1)" }}>
                  {CATEGORIES.find((c) => c.id === activeCategory)?.label ?? "Ustawienia"}
                </h2>
                <button
                  onClick={close}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "var(--text-3)", display: "flex", transition: "color 100ms" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-1)"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-3)"}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content — scrollable */}
              <div className="pt-0 sm:pt-0" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                {/* Mobile spacer for tabs */}
                <div className="h-[48px] sm:h-0" />
                <SettingsCategoryContent category={activeCategory} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Category content placeholder ─────────────────────────────────────────
// This renders the corresponding section from the existing SettingsClient.
// For now, it shows a message directing users to /settings for the full form.
// The existing SettingsClient sections will be extracted incrementally.

function SettingsCategoryContent({ category }: { category: string }) {
  // Import sections lazily from the settings page
  // For now, render inline content for each category
  const sectionMap: Record<string, { title: string; description: string }> = {
    company: { title: "Profil firmy", description: "Nazwa firmy, NIP, adres, waluta, forma opodatkowania" },
    tax: { title: "Podatki i ZUS", description: "Etap ZUS, okres VAT, stawka ryczaltu, data rozpoczecia" },
    invoices: { title: "Faktury", description: "Szablon numeracji, licznik faktur, KSeF" },
    ai: { title: "AI / Ollama", description: "Lokalna AI do kategoryzacji transakcji" },
    notifications: { title: "Powiadomienia", description: "SMTP, alerty budzetowe, digest e-mail" },
    vault: { title: "Skarbiec", description: "Eksport/import danych, zmiana hasla, historia zmian" },
    plugins: { title: "Wtyczki", description: "Wbudowane i spolecznosciowe pluginy" },
    app: { title: "Aplikacja", description: "Instalacja PWA, motyw, informacje o wersji" },
  };

  const info = sectionMap[category] ?? { title: category, description: "" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>
        {info.description}
      </p>
      <div style={{ padding: 32, textAlign: "center", color: "var(--text-3)", fontSize: 13, border: "1px dashed var(--border)", borderRadius: 8 }}>
        Sekcja dostepna na stronie{" "}
        <a href="/settings" style={{ color: "var(--text-1)", textDecoration: "underline" }}>/settings</a>
        {" "}— pelna integracja z modalem w toku.
      </div>
    </div>
  );
}
