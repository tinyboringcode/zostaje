"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  PanelLeft,
  LayoutDashboard,
  ArrowLeftRight,
  Building2,
  Download,
  BarChart3,
  Receipt,
  Target,
  Activity,
  RefreshCcw,
  Tag,
  History,
  BookOpen,
  Sparkles,
  Settings,
} from "lucide-react";
import { QuickAdd } from "@/components/quick-add/QuickAdd";

// ── Nav structure ──────────────────────────────────────────────────────────

const NAV_GROUPS: { href: string; label: string; icon: React.ElementType }[][] = [
  [
    { href: "/",             label: "Przegląd",          icon: LayoutDashboard },
    { href: "/transactions", label: "Transakcje",         icon: ArrowLeftRight },
    { href: "/contractors",  label: "Kontrahenci",        icon: Building2 },
    { href: "/import",       label: "Import",             icon: Download },
    { href: "/reports",      label: "Raporty",            icon: BarChart3 },
  ],
  [
    { href: "/podatki",      label: "Podatki i ZUS",      icon: Receipt },
    { href: "/budgets",      label: "Budżety",            icon: Target },
    { href: "/wskazniki",    label: "Wskaźniki",          icon: Activity },
    { href: "/cykl",         label: "Cykl finansowy",     icon: RefreshCcw },
    { href: "/categories",   label: "Kategorie",          icon: Tag },
  ],
  [
    { href: "/historia",     label: "Historia finansowa", icon: History },
    { href: "/wiedza",       label: "Baza wiedzy",        icon: BookOpen },
    { href: "/ai-demo",      label: "Demo AI",            icon: Sparkles },
  ],
];

const BOTTOM_NAV = [
  { href: "/settings", label: "Ustawienia", icon: Settings },
];

// ── Nav item ───────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  open,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  open: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={!open ? label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 10px",
        borderRadius: 6,
        textDecoration: "none",
        background: active ? "var(--surface2)" : "transparent",
        color: active ? "var(--text-1)" : "var(--text-2)",
        transition: "background 100ms, color 100ms",
        overflow: "hidden",
        whiteSpace: "nowrap",
        minWidth: 0,
        fontFamily: "var(--font-sans)",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
          (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
        }
      }}
    >
      <Icon size={17} style={{ flexShrink: 0 }} />
      <span
        style={{
          fontSize: 14,
          opacity: open ? 1 : 0,
          transition: "opacity 120ms ease",
          overflow: "hidden",
          flex: 1,
          minWidth: 0,
        }}
      >
        {label}
      </span>
    </Link>
  );
}

// ── AppShell ───────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        style={{
          width: open ? 240 : 56,
          transition: "width 200ms ease",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface)",
          flexShrink: 0,
          zIndex: 40,
        }}
      >
        {/* Header: toggle + logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 12px",
            height: 52,
            flexShrink: 0,
            borderBottom: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => setOpen((v) => !v)}
            title={open ? "Zwiń menu" : "Rozwiń menu"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px",
              borderRadius: 6,
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 100ms, color 100ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "none";
              (e.currentTarget as HTMLElement).style.color = "var(--text-2)";
            }}
          >
            <PanelLeft size={17} />
          </button>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-1)",
              textDecoration: "none",
              letterSpacing: "-0.02em",
              opacity: open ? 1 : 0,
              transition: "opacity 120ms ease",
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            zostaje.
          </Link>
        </div>

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "8px 6px",
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && (
                <div
                  style={{
                    height: 1,
                    background: "var(--surface2)",
                    margin: "10px 10px",
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {group.map((item) => (
                  <NavItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    open={open}
                    active={isActive(item.href)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom nav (Ustawienia) */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "8px 6px",
          }}
        >
          {BOTTOM_NAV.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              open={open}
              active={isActive(item.href)}
            />
          ))}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <main style={{ flex: 1, padding: "40px 32px 80px" }}>
          {children}
        </main>
      </div>

      <QuickAdd />
    </div>
  );
}
