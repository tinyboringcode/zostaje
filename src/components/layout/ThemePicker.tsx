"use client";
import { useTheme } from "next-themes";
import { usePalette, PALETTES } from "@/contexts/PaletteContext";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const isDark = theme === "dark";

  return (
    <div className="flex items-center gap-3">
      {/* Mode toggle */}
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
        title={isDark ? "Tryb jasny" : "Tryb ciemny"}
      >
        {isDark
          ? <Sun className="h-3.5 w-3.5" />
          : <Moon className="h-3.5 w-3.5" />
        }
      </button>

      {/* Palette dots */}
      <div className="flex items-center gap-1.5">
        {PALETTES.map((p) => (
          <button
            key={p.id}
            onClick={() => setPalette(p.id)}
            title={p.label}
            className={cn(
              "h-4 w-4 rounded-full transition-all duration-200",
              palette === p.id
                ? "outline outline-2 outline-offset-2 scale-125"
                : "opacity-60 hover:opacity-100 hover:scale-110"
            )}
            style={{
              backgroundColor: isDark ? p.dark : p.color,
              outlineColor: isDark ? p.dark : p.color,
            }}
          />
        ))}
      </div>
    </div>
  );
}
