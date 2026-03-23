"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button, Input, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Spinner, Card, CardBody, Tooltip, Select, SelectItem,
} from "@heroui/react";
import { toast } from "sonner";
import { Plus, Building2, Mail, Phone, Trash2, ChevronRight, AlertCircle, CheckCircle2, Search, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";

interface ContractorSummary {
  id: string;
  name: string;
  companyType: string;
  nip: string;
  email: string;
  phone: string;
  phonePrefix: string;
  totalAmount: number;
  unpaidAmount: number;
  overdueCount: number;
}

const COMPANY_TYPES = [
  { value: "JDG",   label: "JDG",         suffix: "" },
  { value: "SpZoo", label: "Sp. z o.o.",  suffix: " Sp. z o.o." },
  { value: "SA",    label: "S.A.",         suffix: " S.A." },
  { value: "Spk",   label: "Sp.k.",        suffix: " Sp.k." },
  { value: "SKA",   label: "S.K.A.",       suffix: " S.K.A." },
  { value: "SC",    label: "S.C.",         suffix: " S.C." },
  { value: "other", label: "Inna / osoba", suffix: "" },
];

const PHONE_PREFIXES = [
  { value: "+48", label: "🇵🇱 +48" },
  { value: "+49", label: "🇩🇪 +49" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+33", label: "🇫🇷 +33" },
  { value: "+39", label: "🇮🇹 +39" },
  { value: "+34", label: "🇪🇸 +34" },
  { value: "+31", label: "🇳🇱 +31" },
  { value: "+32", label: "🇧🇪 +32" },
  { value: "+41", label: "🇨🇭 +41" },
  { value: "+43", label: "🇦🇹 +43" },
  { value: "+420", label: "🇨🇿 +420" },
  { value: "+421", label: "🇸🇰 +421" },
  { value: "+380", label: "🇺🇦 +380" },
  { value: "+1",  label: "🇺🇸 +1" },
];

const COUNTRIES = [
  { value: "PL", label: "Polska" }, { value: "DE", label: "Niemcy" },
  { value: "GB", label: "Wielka Brytania" }, { value: "FR", label: "Francja" },
  { value: "IT", label: "Włochy" }, { value: "NL", label: "Holandia" },
  { value: "ES", label: "Hiszpania" }, { value: "CZ", label: "Czechy" },
  { value: "SK", label: "Słowacja" }, { value: "UA", label: "Ukraina" },
  { value: "US", label: "USA" }, { value: "OTHER", label: "Inne" },
];

const EMPTY_FORM = {
  name: "", companyType: "other", nip: "", email: "",
  phone: "", phonePrefix: "+48",
  addressStreet: "", addressCity: "", addressPostal: "", addressCountry: "PL",
  notes: "",
};

type FormType = typeof EMPTY_FORM;

export function ContractorsClient() {
  const qc = useQueryClient();
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [form, setForm] = useState<FormType>(EMPTY_FORM);
  const [nipLoading, setNipLoading] = useState(false);
  const set = (k: keyof FormType, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: contractors = [], isLoading } = useQuery<ContractorSummary[]>({
    queryKey: ["contractors"],
    queryFn: () => fetch("/api/contractors").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormType) =>
      fetch("/api/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => { if (!r.ok) { const e = await r.json(); throw new Error(e.error); } return r.json(); }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Kontrahent dodany");
      setForm(EMPTY_FORM);
      onOpenChange();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/contractors/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contractors"] });
      toast.success("Kontrahent usunięty");
    },
  });

  const lookupNip = async () => {
    const nip = form.nip.replace(/\D/g, "");
    if (nip.length !== 10) { toast.error("NIP musi mieć 10 cyfr"); return; }
    setNipLoading(true);
    try {
      const res = await fetch(`/api/nip-lookup?nip=${nip}`);
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Nie znaleziono"); return; }
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        addressStreet: data.addressStreet || f.addressStreet,
        addressCity: data.addressCity || f.addressCity,
        addressPostal: data.addressPostal || f.addressPostal,
        addressCountry: data.addressCountry || f.addressCountry,
      }));
      toast.success(`Pobrano dane: ${data.name} (VAT: ${data.statusVat})`);
    } catch {
      toast.error("Błąd połączenia z rejestrem MF");
    } finally {
      setNipLoading(false);
    }
  };

  const totalUnpaid = contractors.reduce((s, c) => s + c.unpaidAmount, 0);
  const totalOverdue = contractors.reduce((s, c) => s + c.overdueCount, 0);

  // Type stats
  const typeStats = contractors.reduce((acc, c) => {
    acc[c.companyType] = (acc[c.companyType] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Kontrahenci</h1>
          <p className="text-default-500 text-sm mt-1">Baza firm i monitoring należności</p>
        </div>
        <Button color="primary" startContent={<Plus className="h-4 w-4" />} onPress={onOpen} className="shadow-md shadow-primary/20">
          Dodaj kontrahenta
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass glow-hover border-0" shadow="none">
          <CardBody className="p-5">
            <div className="text-xs font-medium text-default-400 uppercase tracking-widest">Kontrahenci</div>
            <div className="text-3xl font-bold mt-2">{contractors.length}</div>
          </CardBody>
        </Card>
        <Card className="glass glow-hover border-0" shadow="none">
          <CardBody className="p-5">
            <div className="text-xs font-medium text-default-400 uppercase tracking-widest">Należności</div>
            <div className="text-2xl font-bold mt-2 text-warning-600 dark:text-warning-400">{formatCurrency(totalUnpaid)}</div>
          </CardBody>
        </Card>
        <Card className="glass glow-hover border-0" shadow="none">
          <CardBody className="p-5">
            <div className="text-xs font-medium text-default-400 uppercase tracking-widest">Po terminie</div>
            <div className={`text-3xl font-bold mt-2 ${totalOverdue > 0 ? "text-danger" : "text-success"}`}>
              {totalOverdue > 0 ? `${totalOverdue} szt.` : "Brak"}
            </div>
          </CardBody>
        </Card>
        <Card className="glass glow-hover border-0" shadow="none">
          <CardBody className="p-5">
            <div className="text-xs font-medium text-default-400 uppercase tracking-widest">Typy firm</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(typeStats).map(([type, count]) => {
                const t = COMPANY_TYPES.find((x) => x.value === type);
                return (
                  <Chip key={type} size="sm" variant="flat" color="primary">
                    {t?.label ?? type} ({count})
                  </Chip>
                );
              })}
              {Object.keys(typeStats).length === 0 && <span className="text-sm text-default-400">—</span>}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* List */}
      <Card className="glass border-0" shadow="none">
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" color="primary" /></div>
          ) : contractors.length === 0 ? (
            <div className="text-center py-12 text-default-400">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Brak kontrahentów</p>
              <p className="text-sm mt-1">Dodaj pierwszego kontrahenta powyżej</p>
            </div>
          ) : (
            <div className="divide-y divide-default-100">
              {contractors.map((c, idx) => {
                const typeLabel = COMPANY_TYPES.find((t) => t.value === c.companyType)?.label;
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-default-50/60 transition-colors animate-slide-up"
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{c.name[0].toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/contractors/${c.id}`} className="font-semibold hover:text-primary transition-colors flex items-center gap-1 group text-sm">
                        {c.name}
                        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        {typeLabel && typeLabel !== "Inna / osoba" && (
                          <Chip size="sm" variant="flat" color="secondary" className="text-xs h-4">{typeLabel}</Chip>
                        )}
                        {c.nip && <span className="text-xs text-default-400">NIP: {c.nip}</span>}
                        {c.email && <span className="text-xs text-default-400 flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                        {c.phone && <span className="text-xs text-default-400 flex items-center gap-1"><Phone className="h-3 w-3" />{c.phonePrefix}{c.phone}</span>}
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="font-semibold text-sm">{formatCurrency(c.unpaidAmount)}</div>
                      <div className="text-xs text-default-400">łącznie {formatCurrency(c.totalAmount)}</div>
                    </div>
                    <div>
                      {c.overdueCount > 0 ? (
                        <Chip color="danger" size="sm" startContent={<AlertCircle className="h-3 w-3" />} variant="flat">
                          {c.overdueCount} po terminie
                        </Chip>
                      ) : c.unpaidAmount > 0 ? (
                        <Chip color="warning" size="sm" variant="flat">Oczekuje</Chip>
                      ) : (
                        <Chip color="success" size="sm" startContent={<CheckCircle2 className="h-3 w-3" />} variant="flat">OK</Chip>
                      )}
                    </div>
                    <Tooltip content="Usuń kontrahenta" color="danger">
                      <Button
                        isIconOnly size="sm" variant="light" color="danger"
                        onPress={() => { if (confirm(`Usunąć ${c.name}?`)) deleteMutation.mutate(c.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" backdrop="blur" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Nowy kontrahent</ModalHeader>
              <ModalBody className="gap-4 pb-2">

                {/* Company type */}
                <div>
                  <div className="text-sm font-medium mb-2 text-default-700">Typ podmiotu</div>
                  <div className="flex flex-wrap gap-2">
                    {COMPANY_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => set("companyType", t.value)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          form.companyType === t.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-default-200 hover:bg-default-50 text-default-600"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {form.companyType !== "other" && form.companyType !== "JDG" && (
                    <p className="text-xs text-default-400 mt-1.5">
                      Sufiks &bdquo;{COMPANY_TYPES.find(t => t.value === form.companyType)?.suffix}&rdquo; zostanie automatycznie uwzględniony przy wyświetlaniu.
                    </p>
                  )}
                </div>

                {/* NIP with lookup */}
                <div className="flex gap-2 items-end">
                  <Input
                    label="NIP"
                    placeholder="10 cyfr"
                    className="flex-1"
                    value={form.nip}
                    onValueChange={(v) => set("nip", v.replace(/\D/g, "").slice(0, 10))}
                    variant="bordered"
                    description="Wpisz NIP i kliknij Szukaj, aby pobrać dane firmy z rejestru MF"
                  />
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="mb-0.5 h-[56px] px-4"
                    isLoading={nipLoading}
                    isDisabled={form.nip.replace(/\D/g, "").length !== 10}
                    startContent={!nipLoading ? <Search className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                    onPress={lookupNip}
                  >
                    {nipLoading ? "Szukam..." : "Szukaj"}
                  </Button>
                </div>

                {/* Name */}
                <Input
                  label="Nazwa firmy / imię i nazwisko"
                  placeholder={form.companyType === "SpZoo" ? "ABC" : form.companyType === "JDG" ? "Jan Kowalski" : "Nazwa"}
                  isRequired
                  value={form.name}
                  onValueChange={(v) => set("name", v)}
                  variant="bordered"
                  description={
                    form.companyType !== "other" && form.companyType !== "JDG" && COMPANY_TYPES.find(t => t.value === form.companyType)?.suffix
                      ? `Pełna nazwa: ${form.name}${COMPANY_TYPES.find(t => t.value === form.companyType)?.suffix}`
                      : undefined
                  }
                />

                {/* Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <Input label="E-mail" type="email" value={form.email} onValueChange={(v) => set("email", v)} variant="bordered" />
                  <div className="flex gap-1.5">
                    <div className="w-[110px] shrink-0">
                      <Select
                        label="Kraj"
                        selectedKeys={[form.phonePrefix]}
                        onSelectionChange={(keys) => set("phonePrefix", Array.from(keys)[0] as string)}
                        variant="bordered"
                        size="sm"
                        className="h-full"
                      >
                        {PHONE_PREFIXES.map((p) => (
                          <SelectItem key={p.value}>{p.label}</SelectItem>
                        ))}
                      </Select>
                    </div>
                    <Input label="Telefon" value={form.phone} onValueChange={(v) => set("phone", v)} variant="bordered" className="flex-1" />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <div className="text-xs text-default-500 font-semibold uppercase tracking-wider mb-2">Adres</div>
                  <div className="space-y-2.5">
                    <Input label="Ulica i numer" placeholder="ul. Przykładowa 1/2" value={form.addressStreet} onValueChange={(v) => set("addressStreet", v)} variant="bordered" />
                    <div className="grid grid-cols-5 gap-2">
                      <Input label="Kod pocztowy" placeholder="00-000" value={form.addressPostal}
                        onValueChange={(v) => set("addressPostal", v)} variant="bordered" className="col-span-2" />
                      <Input label="Miasto" placeholder="Warszawa" value={form.addressCity}
                        onValueChange={(v) => set("addressCity", v)} variant="bordered" className="col-span-3" />
                    </div>
                    <Select
                      label="Kraj"
                      selectedKeys={[form.addressCountry]}
                      onSelectionChange={(keys) => set("addressCountry", Array.from(keys)[0] as string)}
                      variant="bordered"
                    >
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value}>{c.label}</SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>

                <Input label="Notatki" placeholder="Dodatkowe informacje..." value={form.notes} onValueChange={(v) => set("notes", v)} variant="bordered" />
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Anuluj</Button>
                <Button color="primary" isLoading={createMutation.isPending} isDisabled={!form.name}
                  onPress={() => createMutation.mutate(form)}>
                  Dodaj kontrahenta
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
