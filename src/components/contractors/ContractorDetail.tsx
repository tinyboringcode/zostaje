"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button, Input, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Card, CardBody, CardHeader, Divider, Tooltip, Spinner,
} from "@heroui/react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Mail, Phone, MapPin, FileText, CheckCircle2, Clock, AlertCircle, Trash2, StickyNote } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Link from "next/link";

interface Invoice {
  id: string; number: string; amount: number;
  issueDate: string; dueDate: string; paidAt: string | null;
  status: "pending" | "paid" | "overdue"; notes: string;
}
interface Contractor {
  id: string; name: string; nip: string; email: string;
  phone: string; address: string; notes: string; invoices: Invoice[];
}

const STATUS = {
  pending: { label: "Oczekuje", color: "warning" as const, icon: Clock },
  paid:    { label: "Zapłacona", color: "success" as const, icon: CheckCircle2 },
  overdue: { label: "Po terminie", color: "danger" as const, icon: AlertCircle },
};

const EMPTY = { number: "", amount: "", issueDate: new Date().toISOString().split("T")[0], dueDate: "", notes: "" };

export function ContractorDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [form, setForm] = useState(EMPTY);
  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: c, isLoading } = useQuery<Contractor>({
    queryKey: ["contractor", id],
    queryFn: () => fetch(`/api/contractors/${id}`).then((r) => r.json()),
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof EMPTY) =>
      fetch(`/api/contractors/${id}/invoices`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor", id] });
      qc.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Faktura dodana"); setForm(EMPTY); onOpenChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const payMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      fetch(`/api/contractors/${id}/invoices`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor", id] });
      qc.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Oznaczono jako zapłaconą");
    },
  });

  const delMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      fetch(`/api/contractors/${id}/invoices?invoiceId=${invoiceId}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractor", id] });
      qc.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Faktura usunięta");
    },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" color="primary" /></div>;
  if (!c) return <div className="text-danger p-6">Nie znaleziono kontrahenta</div>;

  const invoices = c.invoices ?? [];
  const paidAmount = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const unpaidAmount = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + i.amount, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="flex items-center gap-3">
        <Button as={Link} href="/contractors" isIconOnly variant="light" size="sm">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold gradient-text">{c.name}</h1>
          {c.nip && <p className="text-default-500 text-sm">NIP: {c.nip}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass border-0" shadow="none">
          <CardHeader className="pb-2">
            <span className="text-xs text-default-400 font-semibold uppercase tracking-widest">Dane kontaktowe</span>
          </CardHeader>
          <CardBody className="pt-0 gap-2 text-sm">
            {c.email && (
              <div className="flex items-center gap-2 text-default-600">
                <Mail className="h-4 w-4 text-default-400 shrink-0" />
                <a href={`mailto:${c.email}`} className="hover:text-primary transition-colors">{c.email}</a>
              </div>
            )}
            {c.phone && <div className="flex items-center gap-2 text-default-600"><Phone className="h-4 w-4 text-default-400 shrink-0" />{c.phone}</div>}
            {c.address && <div className="flex items-start gap-2 text-default-600"><MapPin className="h-4 w-4 text-default-400 shrink-0 mt-0.5" />{c.address}</div>}
            {c.notes && (
              <>
                <Divider className="my-1" />
                <div className="flex items-start gap-2 text-default-500">
                  <StickyNote className="h-4 w-4 text-default-400 shrink-0 mt-0.5" />
                  <span className="text-xs">{c.notes}</span>
                </div>
              </>
            )}
            {!c.email && !c.phone && !c.address && (
              <p className="text-default-400 text-xs italic">Brak danych kontaktowych</p>
            )}
          </CardBody>
        </Card>

        <Card className="glass border-0" shadow="none">
          <CardBody className="justify-center gap-4">
            <div>
              <div className="text-xs text-default-400 uppercase tracking-widest">Łącznie faktur</div>
              <div className="text-3xl font-bold mt-1">{invoices.length}</div>
            </div>
            <div>
              <div className="text-xs text-default-400 uppercase tracking-widest">Zapłacono</div>
              <div className="text-2xl font-bold text-success mt-1">{formatCurrency(paidAmount)}</div>
            </div>
          </CardBody>
        </Card>

        <Card className={`glass border-0 ${overdueCount > 0 ? "ring-1 ring-danger/30" : ""}`} shadow="none">
          <CardBody className="justify-center gap-4">
            <div>
              <div className="text-xs text-default-400 uppercase tracking-widest">Do zapłaty</div>
              <div className="text-3xl font-bold text-warning mt-1">{formatCurrency(unpaidAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-default-400 uppercase tracking-widest">Po terminie</div>
              <div className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? "text-danger" : "text-default-400"}`}>
                {overdueCount > 0 ? `${overdueCount} szt.` : "Brak"}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="glass border-0" shadow="none">
        <CardHeader className="flex justify-between items-center px-6">
          <span className="font-semibold">Faktury</span>
          <Button size="sm" color="primary" startContent={<Plus className="h-3.5 w-3.5" />} onPress={onOpen} variant="flat">
            Dodaj fakturę
          </Button>
        </CardHeader>
        <Divider />
        <CardBody className="p-0">
          {invoices.length === 0 ? (
            <div className="text-center py-10 text-default-400">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Brak faktur. Dodaj pierwszą!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-default-100">
                    {["Nr faktury", "Wystawiona", "Termin", "Kwota", "Status", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-default-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const s = STATUS[inv.status];
                    const Icon = s.icon;
                    return (
                      <tr key={inv.id} className="border-b border-default-50 hover:bg-default-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold">{inv.number}</td>
                        <td className="px-4 py-3 text-default-500">{formatDate(inv.issueDate)}</td>
                        <td className="px-4 py-3 text-default-500">{formatDate(inv.dueDate)}</td>
                        <td className="px-4 py-3 font-bold">{formatCurrency(inv.amount)}</td>
                        <td className="px-4 py-3">
                          <Chip color={s.color} size="sm" startContent={<Icon className="h-3 w-3" />} variant="flat">{s.label}</Chip>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            {inv.status !== "paid" && (
                              <Tooltip content="Oznacz jako zapłaconą" color="success">
                                <Button isIconOnly size="sm" variant="light" color="success" onPress={() => payMutation.mutate(inv.id)}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            )}
                            <Tooltip content="Usuń" color="danger">
                              <Button isIconOnly size="sm" variant="light" color="danger"
                                onPress={() => { if (confirm("Usunąć fakturę?")) delMutation.mutate(inv.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Nowa faktura — {c.name}</ModalHeader>
              <ModalBody className="gap-4">
                <Input label="Numer faktury" placeholder="FV/2024/001" isRequired value={form.number} onValueChange={(v) => set("number", v)} variant="bordered" />
                <Input label="Kwota" type="number" placeholder="0.00" isRequired value={form.amount} onValueChange={(v) => set("amount", v)} variant="bordered"
                  startContent={<span className="text-default-400 text-sm">PLN</span>} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Data wystawienia" type="date" value={form.issueDate} onValueChange={(v) => set("issueDate", v)} variant="bordered" />
                  <Input label="Termin płatności" type="date" isRequired value={form.dueDate} onValueChange={(v) => set("dueDate", v)} variant="bordered" />
                </div>
                <Input label="Notatki" value={form.notes} onValueChange={(v) => set("notes", v)} variant="bordered" />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Anuluj</Button>
                <Button color="primary" isLoading={addMutation.isPending}
                  isDisabled={!form.number || !form.amount || !form.dueDate}
                  onPress={() => addMutation.mutate(form)}>
                  Dodaj fakturę
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
