import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL ?? "file:./dev.db" } },
});

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

async function main() {
  console.log("Seeding default categories...");
  for (const cat of defaultCategories) {
    const id = `default-${cat.name.replace(/\//g, "-")}`;
    await prisma.category.upsert({
      where: { id },
      update: {},
      create: { id, ...cat, isDefault: true },
    });
  }
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, companyName: "Moja Firma", currency: "PLN", fiscalYearStart: 1 },
  });
  console.log("Seed complete.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
