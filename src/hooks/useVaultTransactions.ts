"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as storage from "@/lib/storage";
import {
  getAllTransactions,
  filterTransactions,
  aggregateMonthly,
  aggregateByCategory,
  computeWidgets,
  recentTransactions,
  type StoredTx,
  type TxFilters,
} from "@/lib/vault-queries";
import type { TransactionDraft } from "@/lib/types";
import { useVault } from "@/components/vault/VaultProvider";
import { toast } from "sonner";

const VAULT_TX_KEY = ["vault", "transactions"];

/**
 * Core hook: fetches all transactions from the vault.
 * Every other vault query derives from this.
 */
export function useVaultAllTransactions() {
  const { unlocked } = useVault();
  return useQuery<StoredTx[]>({
    queryKey: VAULT_TX_KEY,
    queryFn: getAllTransactions,
    enabled: unlocked,
    staleTime: 5_000,
  });
}

/**
 * Filtered/sorted/paginated transactions — replaces /api/transactions.
 */
export function useVaultTransactions(filters: TxFilters) {
  const { data: all, isLoading } = useVaultAllTransactions();
  const result = all ? filterTransactions(all, filters) : { items: [], total: 0 };
  return { data: result, isLoading, allTxs: all };
}

/**
 * Monthly aggregation — replaces /api/reports/monthly.
 */
export function useVaultMonthly(year: number) {
  const { data: all, isLoading } = useVaultAllTransactions();
  const monthly = all ? aggregateMonthly(all, year) : null;
  return { data: monthly, isLoading };
}

/**
 * Category aggregation — replaces /api/reports/category.
 */
export function useVaultByCategory(year: number) {
  const { data: all, isLoading } = useVaultAllTransactions();
  const categories = all ? aggregateByCategory(all, year) : null;
  return { data: categories, isLoading };
}

/**
 * Widget data for dashboard — replaces /api/widgets.
 */
export function useVaultWidgets(monthKey: string) {
  const { data: all, isLoading } = useVaultAllTransactions();
  const widgets = all ? computeWidgets(all, monthKey) : null;
  return { data: widgets, isLoading };
}

/**
 * Recent transactions for dashboard.
 */
export function useVaultRecent(limit = 6) {
  const { data: all, isLoading } = useVaultAllTransactions();
  const recent = all ? recentTransactions(all, limit) : [];
  return { data: recent, isLoading };
}

/**
 * Mutation: add a transaction to the vault.
 */
export function useVaultAddTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: TransactionDraft) => storage.add<TransactionDraft>("transaction", draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VAULT_TX_KEY });
      toast.success("Transakcja dodana");
    },
    onError: () => toast.error("Nie udalo sie dodac transakcji"),
  });
}

/**
 * Mutation: update a transaction in the vault.
 */
export function useVaultUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionDraft> }) =>
      storage.update<TransactionDraft>("transaction", id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VAULT_TX_KEY });
      toast.success("Transakcja zaktualizowana");
    },
    onError: () => toast.error("Nie udalo sie zaktualizowac transakcji"),
  });
}

/**
 * Mutation: delete a transaction from the vault.
 */
export function useVaultDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => storage.remove("transaction", id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VAULT_TX_KEY });
      toast.success("Transakcja usunieta");
    },
    onError: () => toast.error("Nie udalo sie usunac transakcji"),
  });
}

/**
 * Mutation: bulk delete transactions from the vault.
 */
export function useVaultBulkDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await storage.remove("transaction", id);
      return { deleted: ids.length };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: VAULT_TX_KEY });
      toast.success(`Usunieto ${result.deleted} transakcji`);
    },
    onError: () => toast.error("Blad usuwania"),
  });
}
