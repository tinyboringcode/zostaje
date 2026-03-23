"use client";
import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FeatureKey, DisclosureGate } from "@/lib/disclosure";

interface DisclosureData {
  txCount: number;
  oldestDays: number;
  unlocked: FeatureKey[];
  locked: DisclosureGate[];
  nextUnlock: DisclosureGate | null;
  progressPct: number;
}

interface DisclosureContextValue {
  data: DisclosureData | undefined;
  isUnlocked: (key: FeatureKey) => boolean;
  isLoading: boolean;
}

const DisclosureContext = createContext<DisclosureContextValue>({
  data: undefined,
  isUnlocked: () => true,
  isLoading: false,
});

export function DisclosureProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery<DisclosureData>({
    queryKey: ["disclosure"],
    queryFn: () => fetch("/api/system/progress").then((r) => r.json()),
    staleTime: 60_000,
  });

  const isUnlocked = (key: FeatureKey) =>
    !data || data.unlocked.includes(key);

  return (
    <DisclosureContext.Provider value={{ data, isUnlocked, isLoading }}>
      {children}
    </DisclosureContext.Provider>
  );
}

export function useDisclosure() {
  return useContext(DisclosureContext);
}
