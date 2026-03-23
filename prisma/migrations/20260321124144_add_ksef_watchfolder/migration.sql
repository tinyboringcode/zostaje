-- CreateTable
CREATE TABLE "KSeFImport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ksefNumber" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    "watchFolderEnabled" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Settings" ("address", "companyName", "currency", "fiscalYearStart", "id", "isVatPayer", "nip", "ollamaEnabled", "ollamaModel", "ollamaUrl", "onboardingCompleted", "taxForm") SELECT "address", "companyName", "currency", "fiscalYearStart", "id", "isVatPayer", "nip", "ollamaEnabled", "ollamaModel", "ollamaUrl", "onboardingCompleted", "taxForm" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "KSeFImport_ksefNumber_key" ON "KSeFImport"("ksefNumber");
