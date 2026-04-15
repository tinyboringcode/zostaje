import { PrismaClient } from "@prisma/client";
import { pbkdf2Sync, randomBytes } from "crypto";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? "file:./dev.db" } },
});

// ---------------------------------------------------------------------------
// Default categories
// ---------------------------------------------------------------------------
const defaultCategories = [
  { name: "Usługi IT", color: "#3b82f6", emoji: "💻", type: "EXPENSE" },
  { name: "Sprzęt", color: "#8b5cf6", emoji: "🖥️", type: "EXPENSE" },
  { name: "Oprogramowanie/Subskrypcje", color: "#06b6d4", emoji: "📱", type: "EXPENSE" },
  { name: "Marketing", color: "#f59e0b", emoji: "📣", type: "EXPENSE" },
  { name: "Biuro/Administracja", color: "#6b7280", emoji: "🏢", type: "EXPENSE" },
  { name: "ZUS/Podatki", color: "#ef4444", emoji: "🏛️", type: "EXPENSE" },
  { name: "Paliwo/Transport", color: "#f97316", emoji: "🚗", type: "EXPENSE" },
  { name: "Szkolenia", color: "#10b981", emoji: "📚", type: "EXPENSE" },
  { name: "Inne wydatki", color: "#9ca3af", emoji: "💸", type: "EXPENSE" },
  { name: "Przychód ze sprzedaży", color: "#22c55e", emoji: "💰", type: "INCOME" },
  { name: "Inne przychody", color: "#84cc16", emoji: "📈", type: "INCOME" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Hash password using PBKDF2 (same as src/server/auth.ts) */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 310_000, 64, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

/** Return a Date offset by `daysAgo` days from today, with a random hour */
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

/** Category ID from name (mirrors the upsert logic below) */
function catId(name: string): string {
  return `default-${name.replace(/\//g, "-")}`;
}

// ---------------------------------------------------------------------------
// Demo contractors
// ---------------------------------------------------------------------------
const demoContractors = [
  {
    id: "demo-contractor-leroy",
    name: "Leroy Merlin Sp. z o.o.",
    companyType: "SpZoo",
    nip: "7741009855",
    email: "faktury@leroymerlin.pl",
    addressStreet: "ul. Targowa 72",
    addressCity: "Warszawa",
    addressPostal: "03-734",
    notes: "Materiały budowlane i wykończeniowe",
  },
  {
    id: "demo-contractor-allegro",
    name: "Allegro.pl Sp. z o.o.",
    companyType: "SpZoo",
    nip: "5272525995",
    email: "kontakt@allegro.pl",
    addressStreet: "ul. Grunwaldzka 182",
    addressCity: "Poznań",
    addressPostal: "60-166",
    notes: "Sprzęt elektroniczny, akcesoria",
  },
  {
    id: "demo-contractor-orlen",
    name: "PKN Orlen S.A.",
    companyType: "SA",
    nip: "7740001454",
    email: "kontakt@orlen.pl",
    addressStreet: "ul. Chemików 7",
    addressCity: "Płock",
    addressPostal: "09-411",
    notes: "Paliwo, karty flotowe",
  },
  {
    id: "demo-contractor-mediaexpert",
    name: "Media Expert (TERG S.A.)",
    companyType: "SA",
    nip: "7251000728",
    email: "bok@mediaexpert.pl",
    addressStreet: "ul. Za Dworcem 1D",
    addressCity: "Złotów",
    addressPostal: "77-400",
    notes: "Sprzęt komputerowy i AGD",
  },
  {
    id: "demo-contractor-hydraulik",
    name: "Jan Kowalski — Hydraulika",
    companyType: "JDG",
    nip: "9512345678",
    email: "jan.kowalski@example.com",
    phone: "600123456",
    addressStreet: "ul. Rzemieślnicza 15",
    addressCity: "Kraków",
    addressPostal: "30-001",
    notes: "Usługi hydrauliczne, naprawy",
  },
  {
    id: "demo-contractor-abc",
    name: "ABC Software Sp. z o.o.",
    companyType: "SpZoo",
    nip: "1182034567",
    email: "hello@abcsoftware.pl",
    addressStreet: "ul. Nowogrodzka 50/54",
    addressCity: "Warszawa",
    addressPostal: "00-695",
    notes: "Oprogramowanie, licencje, hosting",
  },
];

// ---------------------------------------------------------------------------
// Demo transactions (last ~3 months)
// ---------------------------------------------------------------------------
const demoTransactions = [
  // --- INCOME ---
  { amount: 15000, days: 5,  desc: "Faktura za projekt e-commerce — klient A",           type: "INCOME",  cat: "Przychód ze sprzedaży", contractor: "demo-contractor-abc" },
  { amount: 8500,  days: 12, desc: "Konsultacja IT — wdrożenie systemu ERP",              type: "INCOME",  cat: "Przychód ze sprzedaży", contractor: null },
  { amount: 12000, days: 25, desc: "Faktura za utrzymanie systemu — styczeń",             type: "INCOME",  cat: "Przychód ze sprzedaży", contractor: "demo-contractor-abc" },
  { amount: 4500,  days: 35, desc: "Szkolenie z Next.js — firma zewnętrzna",              type: "INCOME",  cat: "Inne przychody",        contractor: null },
  { amount: 9800,  days: 45, desc: "Projekt aplikacji mobilnej — etap 1",                 type: "INCOME",  cat: "Przychód ze sprzedaży", contractor: null },
  { amount: 11000, days: 55, desc: "Faktura za utrzymanie systemu — grudzień",             type: "INCOME",  cat: "Przychód ze sprzedaży", contractor: "demo-contractor-abc" },
  { amount: 6500,  days: 70, desc: "Audyt bezpieczeństwa — klient B",                     type: "INCOME",  cat: "Przychód ze sprzedaży", contractor: null },
  { amount: 3200,  days: 80, desc: "Premia za polecenie — program partnerski",            type: "INCOME",  cat: "Inne przychody",        contractor: null },

  // --- EXPENSES ---
  { amount: 850,   days: 2,  desc: "Tankowanie — trasa Warszawa-Kraków",                  type: "EXPENSE", cat: "Paliwo/Transport",            contractor: "demo-contractor-orlen" },
  { amount: 4200,  days: 7,  desc: "Monitor 4K + klawiatura mechaniczna",                  type: "EXPENSE", cat: "Sprzęt",                      contractor: "demo-contractor-allegro" },
  { amount: 2300,  days: 10, desc: "Materiały wykończeniowe — biuro",                      type: "EXPENSE", cat: "Biuro/Administracja",         contractor: "demo-contractor-leroy" },
  { amount: 399,   days: 14, desc: "Licencja JetBrains IntelliJ — roczna",                type: "EXPENSE", cat: "Oprogramowanie/Subskrypcje",  contractor: null },
  { amount: 1580,  days: 18, desc: "ZUS — składka społeczna luty",                        type: "EXPENSE", cat: "ZUS/Podatki",                 contractor: null },
  { amount: 920,   days: 22, desc: "Tankowanie + myjnia",                                 type: "EXPENSE", cat: "Paliwo/Transport",            contractor: "demo-contractor-orlen" },
  { amount: 3500,  days: 30, desc: "Laptop — naprawa + wymiana baterii",                   type: "EXPENSE", cat: "Sprzęt",                      contractor: "demo-contractor-mediaexpert" },
  { amount: 1580,  days: 48, desc: "ZUS — składka społeczna styczeń",                     type: "EXPENSE", cat: "ZUS/Podatki",                 contractor: null },
  { amount: 250,   days: 50, desc: "Hosting VPS — styczeń",                               type: "EXPENSE", cat: "Oprogramowanie/Subskrypcje",  contractor: "demo-contractor-abc" },
  { amount: 1200,  days: 52, desc: "Usługa hydrauliczna — biuro",                         type: "EXPENSE", cat: "Biuro/Administracja",         contractor: "demo-contractor-hydraulik" },
  { amount: 780,   days: 58, desc: "Tankowanie — trasa Kraków-Wrocław",                   type: "EXPENSE", cat: "Paliwo/Transport",            contractor: "demo-contractor-orlen" },
  { amount: 1999,  days: 60, desc: "Kurs AWS Solutions Architect — Udemy",                 type: "EXPENSE", cat: "Szkolenia",                   contractor: null },
  { amount: 5200,  days: 65, desc: "Materiały — remont pomieszczenia serwerowego",         type: "EXPENSE", cat: "Biuro/Administracja",         contractor: "demo-contractor-leroy" },
  { amount: 450,   days: 72, desc: "Domena + certyfikat SSL — roczna",                    type: "EXPENSE", cat: "Oprogramowanie/Subskrypcje",  contractor: null },
  { amount: 2800,  days: 75, desc: "Drukarka laserowa + toner",                           type: "EXPENSE", cat: "Sprzęt",                      contractor: "demo-contractor-mediaexpert" },
  { amount: 350,   days: 78, desc: "Reklama Google Ads — grudzień",                       type: "EXPENSE", cat: "Marketing",                   contractor: null },
  { amount: 1580,  days: 82, desc: "ZUS — składka społeczna grudzień",                    type: "EXPENSE", cat: "ZUS/Podatki",                 contractor: null },
  { amount: 690,   days: 85, desc: "Tankowanie — lokalne przejazdy",                      type: "EXPENSE", cat: "Paliwo/Transport",            contractor: "demo-contractor-orlen" },
];

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------
async function main() {
  // 1. Default categories
  console.log("Seeding default categories...");
  for (const cat of defaultCategories) {
    const id = catId(cat.name);
    await prisma.category.upsert({
      where: { id },
      update: {},
      create: { id, ...cat, isDefault: true },
    });
  }

  // 2. Settings singleton
  console.log("Seeding settings...");
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      companyName: "Demo JDG — Jan Nowak",
      nip: "1234567890",
      taxForm: "linear",
      onboardingCompleted: true,
    },
    create: {
      id: 1,
      companyName: "Demo JDG — Jan Nowak",
      nip: "1234567890",
      taxForm: "linear",
      currency: "PLN",
      fiscalYearStart: 1,
      onboardingCompleted: true,
      zusStage: "full",
      isVatPayer: true,
      address: "ul. Przykładowa 10, 00-001 Warszawa",
    },
  });

  // 3. Demo user
  console.log("Seeding demo user...");
  const hashedPassword = hashPassword("demo1234");
  await prisma.user.upsert({
    where: { email: "demo@zostaje.app" },
    update: { password: hashedPassword, plan: "pro" },
    create: {
      email: "demo@zostaje.app",
      password: hashedPassword,
      plan: "pro",
    },
  });

  // 4. Demo contractors
  console.log("Seeding demo contractors...");
  for (const c of demoContractors) {
    await prisma.contractor.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        companyType: c.companyType,
        nip: c.nip,
        email: c.email,
        phone: c.phone ?? "",
        addressStreet: c.addressStreet,
        addressCity: c.addressCity,
        addressPostal: c.addressPostal,
        addressCountry: "PL",
        notes: c.notes,
      },
    });
  }

  // 5. Demo transactions — delete old demo txns, then create fresh
  console.log("Seeding demo transactions...");
  await prisma.transaction.deleteMany({
    where: { id: { startsWith: "demo-tx-" } },
  });

  for (let i = 0; i < demoTransactions.length; i++) {
    const tx = demoTransactions[i];
    await prisma.transaction.create({
      data: {
        id: `demo-tx-${String(i + 1).padStart(3, "0")}`,
        amount: tx.amount,
        date: daysAgo(tx.days),
        description: tx.desc,
        type: tx.type,
        categoryId: catId(tx.cat),
        contractorId: tx.contractor ?? undefined,
        contractor: tx.contractor
          ? demoContractors.find((c) => c.id === tx.contractor)?.name
          : undefined,
      },
    });
  }

  // 6. Demo budgets (current month)
  console.log("Seeding demo budgets...");
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const demoBudgets = [
    { cat: "Paliwo/Transport", limit: 1500 },
    { cat: "Biuro/Administracja", limit: 5000 },
    { cat: "Oprogramowanie/Subskrypcje", limit: 500 },
    { cat: "Marketing", limit: 800 },
  ];

  for (const b of demoBudgets) {
    const categoryId = catId(b.cat);
    await prisma.budget.upsert({
      where: { userId_categoryId_month: { userId: "default", categoryId, month: currentMonth } },
      update: { limitAmount: b.limit },
      create: {
        id: `demo-budget-${b.cat.toLowerCase().replace(/[^a-z]/g, "")}`,
        userId: "default",
        categoryId,
        month: currentMonth,
        limitAmount: b.limit,
      },
    });
  }

  // 7. Demo invoices
  console.log("Seeding demo invoices...");
  await prisma.contractorInvoice.deleteMany({
    where: { id: { startsWith: "demo-inv-" } },
  });

  const demoInvoices = [
    {
      id: "demo-inv-001",
      contractorId: "demo-contractor-abc",
      number: "FV/2026/001",
      amount: 15000,
      netAmount: 12195.12,
      vatAmount: 2804.88,
      vatRate: 23,
      issueDate: daysAgo(5),
      dueDate: daysAgo(-9), // 14 days from issue, still in future
      status: "pending",
      description: "Projekt e-commerce — klient A",
    },
    {
      id: "demo-inv-002",
      contractorId: "demo-contractor-abc",
      number: "FV/2026/002",
      amount: 12000,
      netAmount: 9756.10,
      vatAmount: 2243.90,
      vatRate: 23,
      issueDate: daysAgo(25),
      dueDate: daysAgo(11),
      paidAt: daysAgo(9),
      status: "paid",
      description: "Utrzymanie systemu — styczeń",
    },
    {
      id: "demo-inv-003",
      contractorId: "demo-contractor-hydraulik",
      number: "FV/2026/003",
      amount: 1200,
      netAmount: 975.61,
      vatAmount: 224.39,
      vatRate: 23,
      issueDate: daysAgo(52),
      dueDate: daysAgo(38),
      status: "overdue",
      description: "Usługa hydrauliczna — naprawa instalacji biuro",
    },
    {
      id: "demo-inv-004",
      contractorId: "demo-contractor-abc",
      number: "FV/2026/004",
      amount: 11000,
      netAmount: 8943.09,
      vatAmount: 2056.91,
      vatRate: 23,
      issueDate: daysAgo(55),
      dueDate: daysAgo(41),
      paidAt: daysAgo(40),
      status: "paid",
      description: "Utrzymanie systemu — grudzień",
    },
  ];

  for (const inv of demoInvoices) {
    await prisma.contractorInvoice.create({
      data: {
        id: inv.id,
        contractorId: inv.contractorId,
        number: inv.number,
        amount: inv.amount,
        netAmount: inv.netAmount,
        vatAmount: inv.vatAmount,
        vatRate: inv.vatRate,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt ?? null,
        status: inv.status,
        description: inv.description,
        currency: "PLN",
      },
    });
  }

  console.log("Seed complete — demo data ready.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
