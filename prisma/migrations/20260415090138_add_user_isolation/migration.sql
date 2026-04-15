-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Budget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "categoryId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "limitAmount" REAL NOT NULL,
    CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Budget" ("categoryId", "id", "limitAmount", "month") SELECT "categoryId", "id", "limitAmount", "month" FROM "Budget";
DROP TABLE "Budget";
ALTER TABLE "new_Budget" RENAME TO "Budget";
CREATE UNIQUE INDEX "Budget_userId_categoryId_month_key" ON "Budget"("userId", "categoryId", "month");
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "emoji" TEXT NOT NULL DEFAULT '📁',
    "type" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "mixedUsagePct" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Category" ("color", "createdAt", "emoji", "id", "isArchived", "isDefault", "mixedUsagePct", "name", "type") SELECT "color", "createdAt", "emoji", "id", "isArchived", "isDefault", "mixedUsagePct", "name", "type" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE TABLE "new_Contractor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "companyType" TEXT NOT NULL DEFAULT 'other',
    "nip" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "phonePrefix" TEXT NOT NULL DEFAULT '+48',
    "addressStreet" TEXT NOT NULL DEFAULT '',
    "addressCity" TEXT NOT NULL DEFAULT '',
    "addressPostal" TEXT NOT NULL DEFAULT '',
    "addressCountry" TEXT NOT NULL DEFAULT 'PL',
    "address" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Contractor" ("address", "addressCity", "addressCountry", "addressPostal", "addressStreet", "companyType", "createdAt", "email", "id", "name", "nip", "notes", "phone", "phonePrefix") SELECT "address", "addressCity", "addressCountry", "addressPostal", "addressStreet", "companyType", "createdAt", "email", "id", "name", "nip", "notes", "phone", "phonePrefix" FROM "Contractor";
DROP TABLE "Contractor";
ALTER TABLE "new_Contractor" RENAME TO "Contractor";
CREATE TABLE "new_ContractorInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "contractorId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "issueDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vatRate" INTEGER NOT NULL DEFAULT 23,
    "netAmount" REAL NOT NULL DEFAULT 0,
    "vatAmount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "description" TEXT NOT NULL DEFAULT '',
    "template" TEXT NOT NULL DEFAULT 'standard',
    "sentAt" DATETIME,
    "ksefRef" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "ContractorInvoice_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ContractorInvoice" ("amount", "contractorId", "createdAt", "currency", "description", "dueDate", "id", "issueDate", "ksefRef", "netAmount", "notes", "number", "paidAt", "sentAt", "status", "template", "vatAmount", "vatRate") SELECT "amount", "contractorId", "createdAt", "currency", "description", "dueDate", "id", "issueDate", "ksefRef", "netAmount", "notes", "number", "paidAt", "sentAt", "status", "template", "vatAmount", "vatRate" FROM "ContractorInvoice";
DROP TABLE "ContractorInvoice";
ALTER TABLE "new_ContractorInvoice" RENAME TO "ContractorInvoice";
CREATE TABLE "new_LockedMonth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "month" TEXT NOT NULL,
    "lockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_LockedMonth" ("id", "lockedAt", "month", "note") SELECT "id", "lockedAt", "month", "note" FROM "LockedMonth";
DROP TABLE "LockedMonth";
ALTER TABLE "new_LockedMonth" RENAME TO "LockedMonth";
CREATE UNIQUE INDEX "LockedMonth_userId_month_key" ON "LockedMonth"("userId", "month");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL DEFAULT 'default',
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "contractor" TEXT,
    "type" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "contractorId" TEXT,
    "invoiceId" TEXT,
    "currency" TEXT,
    "originalAmount" REAL,
    "currencyRate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transaction_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "ContractorInvoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "categoryId", "contractor", "contractorId", "createdAt", "currency", "currencyRate", "date", "description", "id", "invoiceId", "originalAmount", "type", "updatedAt") SELECT "amount", "categoryId", "contractor", "contractorId", "createdAt", "currency", "currencyRate", "date", "description", "id", "invoiceId", "originalAmount", "type", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_invoiceId_key" ON "Transaction"("invoiceId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
