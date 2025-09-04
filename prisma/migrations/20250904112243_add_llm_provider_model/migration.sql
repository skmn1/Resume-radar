-- CreateTable
CREATE TABLE "llm_providers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT NOT NULL,
    "apiKeyEnvVar" TEXT NOT NULL,
    "totalUsage" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTime" REAL,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "llm_providers_name_key" ON "llm_providers"("name");
