"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency, formatDate, monthLabel } from "@/lib/formatters";
import { InvoiceForm } from "./InvoiceForm";
import {
  FileText, Plus, Printer, Pencil, Trash2, CheckCircle,
  AlertCircle, Clock, XCircle, TrendingUp, TrendingDown,
} from "lucide-react";

type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  netAmount: number;
  vatAmount: number;
  vatRate: number;
  currency: string;
  description: string;
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  status: InvoiceStatus;
  notes: string;
  template: string;
  ksefRef: string;
  contractor: { id: string; name: string; nip: string };
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Oczekuje", color: "text-amber-600 bg-amber-50 border-amber-200", icon: Clock },
  paid: { label: "Opłacona", color: "text-green-600 bg-green-50 border-green-200", icon: CheckCircle },
  overdue: { label: "Po terminie", color: "text-red-600 bg-red-50 border-red-200", icon: AlertCircle },
  cancelled: { label: "Anulowana", color: "text-gray-500 bg-gray-50 border-gray-200", icon: XCircle },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function FakturyClient() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

  const params = new URLSearchParams();
  if (filterStatus !== "all") params.set("status", filterStatus);
  if (filterMonth) params.set("month", filterMonth);

  const { data = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["faktury", filterStatus, filterMonth],
    queryFn: () => fetch(`/api/faktury?${params}`).then((r) => r.json()),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/faktury/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faktury"] });
      toast.success("Faktura oznaczona jako opłacona");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/faktury/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faktury"] });
      toast.success("Faktura usunięta");
    },
  });

  const invoices = Array.isArray(data) ? data : [];
  const totalIssued = invoices.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending = invoices.filter((i) => i.status === "pending" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Faktury
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Zarządzaj fakturami VAT i śledź płatności</p>
        </div>
        <button
          onClick={() => { setEditInvoice(null); setFormOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nowa faktura
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Wystawione", value: formatCurrency(totalIssued), icon: FileText, color: "text-primary" },
          { label: "Opłacone", value: formatCurrency(totalPaid), icon: TrendingUp, color: "text-green-600" },
          { label: "Oczekujące", value: formatCurrency(totalPending), icon: TrendingDown, color: "text-amber-600" },
          { label: "Po terminie", value: String(overdueCount), icon: AlertCircle, color: "text-red-600", suffix: " faktur" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Icon className={`h-3.5 w-3.5 ${kpi.color}`} />
                {kpi.label}
              </div>
              <div className={`text-xl font-bold ${kpi.color}`}>
                {kpi.value}{kpi.suffix ?? ""}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border bg-background"
        >
          <option value="all">Wszystkie statusy</option>
          <option value="pending">Oczekujące</option>
          <option value="paid">Opłacone</option>
          <option value="overdue">Po terminie</option>
          <option value="cancelled">Anulowane</option>
        </select>
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border bg-background"
        >
          <option value="">Wszystkie miesiące</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
      </div>

      {/* Invoice list */}
      <div className="glass rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Ładowanie...</div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Brak faktur</p>
            <button
              onClick={() => { setEditInvoice(null); setFormOpen(true); }}
              className="mt-3 text-primary text-sm hover:underline"
            >
              Wystaw pierwszą fakturę →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Numer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kontrahent</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Opis</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Netto</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Brutto</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Termin</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{inv.number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{inv.contractor.name}</div>
                      {inv.contractor.nip && <div className="text-xs text-muted-foreground">NIP: {inv.contractor.nip}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{inv.description || "—"}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatCurrency(inv.netAmount || inv.amount / (1 + inv.vatRate / 100))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">
                      {formatCurrency(inv.amount, inv.currency !== "PLN" ? inv.currency : undefined)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status as InvoiceStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <a
                          href={`/faktury/${inv.id}/druk`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Drukuj / PDF"
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                        >
                          <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                        </a>
                        {inv.status !== "paid" && inv.status !== "cancelled" && (
                          <button
                            onClick={() => markPaid.mutate(inv.id)}
                            title="Oznacz jako opłaconą"
                            className="p-1.5 hover:bg-green-50 rounded-md transition-colors"
                          >
                            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                          </button>
                        )}
                        <button
                          onClick={() => { setEditInvoice(inv); setFormOpen(true); }}
                          title="Edytuj"
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Usunąć fakturę ${inv.number}?`)) deleteMutation.mutate(inv.id);
                          }}
                          title="Usuń"
                          className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceForm open={formOpen} onClose={() => setFormOpen(false)} editInvoice={editInvoice} />
    </div>
  );
}
