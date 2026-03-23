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
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Settings" ("companyName", "currency", "fiscalYearStart", "id") SELECT "companyName", "currency", "fiscalYearStart", "id" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
