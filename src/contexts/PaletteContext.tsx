"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Palette = "cosmos" | "ocean" | "amber" | "emerald" | "rose" | "mono";

export const PALETTES: { id: Palette; label: string; color: string; dark: string }[] = [
  { id: "cosmos", label: "Cosmos",   color: "#6366f1", dark: "#818cf8" },
  { id: "ocean",  label: "Ocean",    color: "#0ea5e9", dark: "#38bdf8" },
  { id: "amber",  label: "Amber",    color: "#f59e0b", dark: "#fbbf24" },
  { id: "emerald",label: "Emerald",  color: "#10b981", dark: "#34d399" },
  { id: "rose",   label: "Rose",     color: "#f43f5e", dark: "#fb7185" },
  { id: "mono",   label: "Mono",     color: "#6b7280", dark: "#9ca3af" },
];

interface PaletteContextType {
  palette: Palette;
  setPalette: (p: Palette) => void;
}

const PaletteContext = createContext<PaletteContextType>({
  palette: "cosmos",
  setPalette: () => {},
});

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<Palette>("cosmos");

  useEffect(() => {
    const saved = (localStorage.getItem("cf-palette") as Palette) ?? "cosmos";
    setPaletteState(saved);
    document.documentElement.setAttribute("data-palette", saved);
  }, []);

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    localStorage.setItem("cf-palette", p);
    document.documentElement.setAttribute("data-palette", p);
  };

  return (
    <PaletteContext.Provider value={{ palette, setPalette }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() { return useContext(PaletteContext); }
