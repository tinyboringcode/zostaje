-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "currency" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "currencyRate" REAL;
ALTER TABLE "Transaction" ADD COLUMN "originalAmount" REAL;

-- CreateTable
CREATE TABLE "LockedMonth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" TEXT NOT NULL,
    "lockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "SyncBlob" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "blob" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ContractorInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
INSERT INTO "new_ContractorInvoice" ("amount", "contractorId", "createdAt", "dueDate", "id", "issueDate", "notes", "number", "paidAt", "status") SELECT "amount", "contractorId", "createdAt", "dueDate", "id", "issueDate", "notes", "number", "paidAt", "status" FROM "ContractorInvoice";
DROP TABLE "ContractorInvoice";
ALTER TABLE "new_ContractorInvoice" RENAME TO "ContractorInvoice";
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "companyName" TEXT NOT NULL DEFAULT 'Moja Firma',
    "nip" TEXT NOT NULL DEFAULT '',
    "taxForm" TEXT NOT NULL DEFAULT 'linear',
    "isVatPayer" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "fiscalYearStart" INTEGER NOT NULL DEFAULT 1,
    "ollamaUrl" TEXT NOT NULL DEFAULT 'http://localhost:11434',
    "ollamaModel" TEXT NOT NULL DEFAULT 'llama3.2',
    "ollamaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "ksefToken" TEXT NOT NULL DEFAULT '',
    "ksefEnvironment" TEXT NOT NULL DEFAULT 'test',
    "ksefEnabled" BOOLEAN NOT NULL DEFAULT false,
    "watchFolderPath" TEXT NOT NULL DEFAULT '',
    "watchFolderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmail" TEXT NOT NULL DEFAULT '',
    "smtpHost" TEXT NOT NULL DEFAULT '',
    "smtpPort" INTEGER NOT NULL DEFAULT 587,
    "smtpUser" TEXT NOT NULL DEFAULT '',
    "smtpPass" TEXT NOT NULL DEFAULT '',
    "smtpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "budgetAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "budgetAlertThreshold" INTEGER NOT NULL DEFAULT 80,
    "notifyInterval" TEXT NOT NULL DEFAULT 'immediate',
    "lastBudgetCheckAt" DATETIME,
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "digestDays" INTEGER NOT NULL DEFAULT 7,
    "lastDigestSentAt" DATETIME,
    "invoiceTemplate" TEXT NOT NULL DEFAULT 'FV/{YYYY}/{NNN}',
    "invoiceCounter" INTEGER NOT NULL DEFAULT 1,
    "bankAccount" TEXT NOT NULL DEFAULT '',
    "backupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "backupPath" TEXT NOT NULL DEFAULT './backups',
    "backupLastAt" DATETIME,
    "companyStartDate" TEXT NOT NULL DEFAULT '',
    "zusStage" TEXT NOT NULL DEFAULT 'full',
    "vatPeriod" TEXT NOT NULL DEFAULT 'monthly',
    "ryczaltRate" INTEGER NOT NULL DEFAULT 12
);
INSERT INTO "new_Settings" ("address", "budgetAlertEnabled", "budgetAlertThreshold", "companyName", "companyStartDate", "currency", "digestDays", "digestEnabled", "digestFrequency", "fiscalYearStart", "id", "invoiceCounter", "invoiceTemplate", "isVatPayer", "ksefEnabled", "ksefEnvironment", "ksefToken", "lastBudgetCheckAt", "lastDigestSentAt", "nip", "notificationEmail", "notifyInterval", "ollamaEnabled", "ollamaModel", "ollamaUrl", "onboardingCompleted", "ryczaltRate", "smtpEnabled", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "taxForm", "vatPeriod", "watchFolderEnabled", "watchFolderPath", "zusStage") SELECT "address", "budgetAlertEnabled", "budgetAlertThreshold", "companyName", "companyStartDate", "currency", "digestDays", "digestEnabled", "digestFrequency", "fiscalYearStart", "id", "invoiceCounter", "invoiceTemplate", "isVatPayer", "ksefEnabled", "ksefEnvironment", "ksefToken", "lastBudgetCheckAt", "lastDigestSentAt", "nip", "notificationEmail", "notifyInterval", "ollamaEnabled", "ollamaModel", "ollamaUrl", "onboardingCompleted", "ryczaltRate", "smtpEnabled", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "taxForm", "vatPeriod", "watchFolderEnabled", "watchFolderPath", "zusStage" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "LockedMonth_month_key" ON "LockedMonth"("month");

-- CreateIndex
CREATE INDEX "SyncBlob_userId_version_idx" ON "SyncBlob"("userId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
