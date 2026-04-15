"use client";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  PanelLeft,
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  BarChart3,
  Settings,
  Command,
  FileText,
  TrendingUp,
  Calculator,
  Network,
  FolderKanban,
  Zap,
  History,
  ChevronRight,
  Receipt,
  PieChart,
  Activity,
  Sparkles,
  BookOpen,
  Menu,
  X,
} from "lucide-react";
import { QuickAdd } from "@/components/quick-add/QuickAdd";
import { PageTransition } from "./PageTransition";

// ── Nav structure ──────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  available?: boolean; // undefined/true = enabled, false = disabled (coming soon)
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

// Pages available in this release
const AVAILABLE: Set<string> = new Set([
  "/dashboard", "/transactions", "/faktury", "/contractors",
  "/reports", "/podatki", "/budgets", "/categories", "/audit",
]);

const NAV_GROUPS: NavGroup[] = [
  {
    id: "daily",
    label: "Na co dzien",
    items: [
      { href: "/dashboard",    label: "Przeglad",      icon: LayoutDashboard },
      { href: "/transactions", label: "Transakcje",     icon: ArrowLeftRight },
      { href: "/faktury",      label: "Faktury",        icon: FileText },
      { href: "/contractors",  label: "Kontrahenci",    icon: Building2 },
    ],
  },
  {
    id: "analysis",
    label: "Analizy",
    items: [
      { href: "/reports",     label: "Raporty",        icon: BarChart3 },
      { href: "/podatki",     label: "Podatki i ZUS",  icon: Calculator },
      { href: "/wskazniki",   label: "Wskazniki",      icon: TrendingUp },
      { href: "/budgets",     label: "Budzety",        icon: PieChart },
    ],
  },
  {
    id: "discover",
    label: "Odkrywaj",
    items: [
      { href: "/graph",       label: "Graf powiazan",  icon: Network },
      { href: "/projects",    label: "Projekty",       icon: FolderKanban },
      { href: "/rules",       label: "Reguly",         icon: Zap },
      { href: "/audit",       label: "Dziennik zmian", icon: History },
    ],
  },
  {
    id: "more",
    label: "Wiecej",
    items: [
      { href: "/categories",  label: "Kategorie",      icon: Receipt },
      { href: "/cykl",        label: "Cykl finansowy",  icon: Activity },
      { href: "/ai-demo",     label: "Demo AI",         icon: Sparkles },
      { href: "/wiedza",      label: "Baza wiedzy",     icon: BookOpen },
    ],
  },
].map((group) => ({
  ...group,
  items: group.items.map((item) => ({
    ...item,
    available: AVAILABLE.has(item.href),
  })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────

function getInitialCollapsed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("zostaje.nav.collapsed");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCollapsed(state: Record<string, boolean>) {
  try { localStorage.setItem("zostaje.nav.collapsed", JSON.stringify(state)); } catch { /* ignore */ }
}

// ── SidebarNavItem ───────────────────────────────────────────────────────

function SidebarNavItem({
  href, label, icon: Icon, open, active, available = true,
}: {
  href: string; label: string; icon: React.ElementType; open: boolean; active: boolean; available?: boolean;
}) {
  if (!available) {
    return (
      <div
        title="Funkcja niedostepna w tej wersji"
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "6px 10px", borderRadius: 7,
          color: "var(--text-3)",
          overflow: "hidden", whiteSpace: "nowrap", minWidth: 0,
          fontFamily: "var(--font-sans)",
          opacity: 0.4,
          cursor: "not-allowed",
          userSelect: "none",
        }}
      >
        <Icon size={16} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, opacity: open ? 1 : 0, transition: "opacity 120ms ease", overflow: "hidden", flex: 1, minWidth: 0 }}>
          {label}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      title={!open ? label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 10px", borderRadius: 7, textDecoration: "none",
        background: active ? "var(--bg)" : "transparent",
        color: active ? "var(--text-1)" : "var(--text-2)",
        transition: "background 140ms ease, color 140ms ease, box-shadow 140ms ease",
        overflow: "hidden", whiteSpace: "nowrap", minWidth: 0,
        fontFamily: "var(--font-sans)",
        boxShadow: active ? "var(--shadow-sm)" : "none",
        fontWeight: active ? 500 : 400,
      }}
      onMouseEnter={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; (e.currentTarget as HTMLElement).style.color = "var(--text-1)"; } }}
      onMouseLeave={(e) => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; } }}
    >
      <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.65 }} />
      <span style={{ fontSize: 13, opacity: open ? 1 : 0, transition: "opacity 120ms ease", overflow: "hidden", flex: 1, minWidth: 0 }}>
        {label}
      </span>
    </Link>
  );
}

// ── AppShell ───────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(getInitialCollapsed);
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  const toggleGroup = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveCollapsed(next);
      return next;
    });
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileDrawer(false); }, [pathname]);

  // Close mobile drawer on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileDrawer(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const renderNav = (open: boolean) => (
    <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "6px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
      {NAV_GROUPS.map((group) => {
        const isCollapsed = collapsed[group.id] && open;
        return (
          <div key={group.id}>
            {/* Group header */}
            {open && (
              <button
                onClick={() => toggleGroup(group.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, width: "100%",
                  padding: "6px 10px", margin: "6px 0 2px", background: "none", border: "none",
                  cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 10,
                  fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
                  color: "var(--text-3)", transition: "color 100ms",
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-2)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-3)"}
              >
                <ChevronRight size={10} style={{ transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)", transition: "transform 150ms ease" }} />
                {group.label}
              </button>
            )}
            {/* Items */}
            {!isCollapsed && group.items.map((item) => (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                open={open}
                active={isActive(item.href)}
                available={item.available}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Desktop Sidebar ────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex"
        style={{
          width: sidebarOpen ? 220 : 56,
          transition: "width 200ms ease",
          position: "sticky", top: 0, height: "100vh",
          overflowY: "auto", overflowX: "hidden",
          borderRight: "1px solid var(--border)",
          flexDirection: "column",
          background: "var(--surface)", flexShrink: 0, zIndex: 40,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 12px", height: 52, flexShrink: 0, borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Zwin menu" : "Rozwin menu"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", borderRadius: 6, color: "var(--text-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 100ms, color 100ms" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; (e.currentTarget as HTMLElement).style.color = "var(--text-1)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
          >
            <PanelLeft size={17} />
          </button>
          <Link href="/dashboard" style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, color: "var(--text-1)", textDecoration: "none", letterSpacing: "-0.02em", opacity: sidebarOpen ? 1 : 0, transition: "opacity 120ms ease", whiteSpace: "nowrap", overflow: "hidden" }}>
            zostaje.
          </Link>
        </div>

        {renderNav(sidebarOpen)}

        {/* Cmd+K hint + Settings */}
        <div style={{ borderTop: "1px solid var(--border)", padding: "6px 6px" }}>
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            title={!sidebarOpen ? "Cmd+K" : undefined}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 7, background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", width: "100%", overflow: "hidden", whiteSpace: "nowrap", fontFamily: "var(--font-sans)", transition: "color 140ms ease" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-2)"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "var(--text-3)"}
          >
            <Command size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
            <span style={{ fontSize: 12, opacity: sidebarOpen ? 1 : 0, transition: "opacity 120ms ease", display: "flex", alignItems: "center", gap: 6 }}>
              Szukaj
              <kbd style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-3)", fontFamily: "var(--font-sans)" }}>
                ⌘K
              </kbd>
            </span>
          </button>

          <SidebarNavItem href="/settings" label="Ustawienia" icon={Settings} open={sidebarOpen} active={isActive("/settings")} />
        </div>
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div
        className="flex md:hidden"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          height: 52, padding: "0 16px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={() => setMobileDrawer(true)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--text-2)", display: "flex" }}
        >
          <Menu size={20} />
        </button>
        <Link href="/dashboard" style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, color: "var(--text-1)", textDecoration: "none" }}>
          zostaje.
        </Link>
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--text-2)", display: "flex" }}
        >
          <Command size={18} />
        </button>
      </div>

      {/* ── Mobile drawer overlay ──────────────────────────────────────── */}
      {mobileDrawer && (
        <div className="md:hidden" style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }} onClick={() => setMobileDrawer(false)} />
          <aside style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 260,
            background: "var(--surface)", borderRight: "1px solid var(--border)",
            display: "flex", flexDirection: "column",
            animation: "slide-in-left 200ms ease both",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 52, borderBottom: "1px solid var(--border)" }}>
              <Link href="/dashboard" style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 500, color: "var(--text-1)", textDecoration: "none" }}>
                zostaje.
              </Link>
              <button onClick={() => setMobileDrawer(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "var(--text-2)", display: "flex" }}>
                <X size={18} />
              </button>
            </div>
            {renderNav(true)}
            <div style={{ borderTop: "1px solid var(--border)", padding: "6px 6px" }}>
              <SidebarNavItem href="/settings" label="Ustawienia" icon={Settings} open={true} active={isActive("/settings")} />
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <main className="pt-0 md:pt-0" style={{ flex: 1, padding: "44px 40px 80px" }}>
          {/* Mobile spacer for fixed top bar */}
          <div className="h-[52px] md:h-0" />
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </main>
      </div>

      <QuickAdd />

      {/* ── Mobile slide animation ──────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes slide-in-left {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
