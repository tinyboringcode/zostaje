"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip } from "@heroui/react";
import {
  LayoutDashboard, ArrowLeftRight, Tag, Target, BarChart3,
  Settings, TrendingUp, Download, Building2, Sparkles, Activity,
  Receipt, RefreshCcw, History, BookOpen, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTour } from "@/contexts/TourContext";

const NAV_GROUPS = [
  {
    label: null, // no header for first group
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Na co dzień",
    items: [
      { href: "/transactions", label: "Transakcje", icon: ArrowLeftRight },
      { href: "/faktury", label: "Faktury", icon: FileText },
      { href: "/import", label: "Import", icon: Download },
      { href: "/contractors", label: "Kontrahenci", icon: Building2 },
    ],
  },
  {
    label: "Analizy",
    items: [
      { href: "/reports", label: "Raporty", icon: BarChart3 },
      { href: "/wskazniki", label: "Wskaźniki", icon: Activity },
      { href: "/cykl", label: "Cykl finansowy", icon: RefreshCcw },
      { href: "/ai-demo", label: "Demo AI", icon: Sparkles },
    ],
  },
  {
    label: "Finanse",
    items: [
      { href: "/podatki", label: "Podatki i ZUS", icon: Receipt },
      { href: "/budgets", label: "Budżety", icon: Target },
      { href: "/categories", label: "Kategorie", icon: Tag },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/historia", label: "Historia finansowa", icon: History },
      { href: "/wiedza", label: "Baza wiedzy", icon: BookOpen },
      { href: "/settings", label: "Ustawienia", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { activeHref } = useTour();

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen sidebar-glass sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
          <TrendingUp className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm leading-tight">CashFlow</div>
          <div className="text-[11px] text-muted-foreground">JDG Panel</div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-3 px-2 space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <div className="px-2 mb-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const tourHighlight = !active && activeHref === item.href;
                return (
                  <Tooltip key={item.href} content={item.label} placement="right" className="md:hidden">
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                        active
                          ? "bg-primary text-white shadow-sm shadow-primary/30"
                          : tourHighlight
                          ? "ring-2 ring-primary/60 bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/5"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active && "drop-shadow-sm")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
