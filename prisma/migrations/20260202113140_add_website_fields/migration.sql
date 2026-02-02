/*
  Warnings:

  - The primary key for the `Lead` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `aiReason` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `aiScore` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `outreachMessage` on the `Lead` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Lead` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `updatedAt` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "category" TEXT,
    "location" TEXT,
    "website" TEXT,
    "source" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "potentialScore" INTEGER,
    "potentialCategory" TEXT,
    "aiNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Lead" ("category", "createdAt", "id", "location", "name", "phone", "score", "source", "website") SELECT "category", "createdAt", "id", "location", "name", "phone", "score", "source", "website" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
