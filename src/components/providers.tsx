"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeroUIProvider } from "@heroui/react";
import { Toaster } from "sonner";
import { useState } from "react";
import { VaultProvider } from "@/components/vault/VaultProvider";
import { CommandPalette } from "@/components/vault/CommandPalette";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider>
        <VaultProvider>
          {children}
          <CommandPalette />
          <InstallPrompt />
        </VaultProvider>
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              borderRadius: 4,
            },
          }}
        />
      </HeroUIProvider>
    </QueryClientProvider>
  );
}
