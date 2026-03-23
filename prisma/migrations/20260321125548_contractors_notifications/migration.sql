-- CreateTable
CREATE TABLE "Contractor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nip" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ContractorInvoice" (
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
    CONSTRAINT "ContractorInvoice_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "Contractor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "lastBudgetCheckAt" DATETIME
);
INSERT INTO "new_Settings" ("address", "companyName", "currency", "fiscalYearStart", "id", "isVatPayer", "ksefEnabled", "ksefEnvironment", "ksefToken", "nip", "ollamaEnabled", "ollamaModel", "ollamaUrl", "onboardingCompleted", "taxForm", "watchFolderEnabled", "watchFolderPath") SELECT "address", "companyName", "currency", "fiscalYearStart", "id", "isVatPayer", "ksefEnabled", "ksefEnvironment", "ksefToken", "nip", "ollamaEnabled", "ollamaModel", "ollamaUrl", "onboardingCompleted", "taxForm", "watchFolderEnabled", "watchFolderPath" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
