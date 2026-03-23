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
    "lastBudgetCheckAt" DATETIME,
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "digestDays" INTEGER NOT NULL DEFAULT 7,
    "lastDigestSentAt" DATETIME
);
INSERT INTO "new_Settings" ("address", "budgetAlertEnabled", "budgetAlertThreshold", "companyName", "currency", "fiscalYearStart", "id", "isVatPayer", "ksefEnabled", "ksefEnvironment", "ksefToken", "lastBudgetCheckAt", "nip", "notificationEmail", "notifyInterval", "ollamaEnabled", "ollamaModel", "ollamaUrl", "onboardingCompleted", "smtpEnabled", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "taxForm", "watchFolderEnabled", "watchFolderPath") SELECT "address", "budgetAlertEnabled", "budgetAlertThreshold", "companyName", "currency", "fiscalYearStart", "id", "isVatPayer", "ksefEnabled", "ksefEnvironment", "ksefToken", "lastBudgetCheckAt", "nip", "notificationEmail", "notifyInterval", "ollamaEnabled", "ollamaModel", "ollamaUrl", "onboardingCompleted", "smtpEnabled", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "taxForm", "watchFolderEnabled", "watchFolderPath" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
