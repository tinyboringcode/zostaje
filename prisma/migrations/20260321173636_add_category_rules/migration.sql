-- CreateTable
CREATE TABLE "CategoryRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "txType" TEXT NOT NULL DEFAULT 'EXPENSE',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CategoryRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CategoryRule_word_categoryId_txType_key" ON "CategoryRule"("word", "categoryId", "txType");
