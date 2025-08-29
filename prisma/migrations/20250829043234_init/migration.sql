-- CreateTable
CREATE TABLE "Cve" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "published" DATETIME NOT NULL,
    "lastModified" DATETIME NOT NULL,
    "sourceIdentifier" TEXT,
    "title" TEXT,
    "description" TEXT,
    "cwes" JSONB NOT NULL DEFAULT [],
    "references" JSONB NOT NULL DEFAULT []
);

-- CreateTable
CREATE TABLE "CvssSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cveId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "vectorString" TEXT,
    "baseScore" REAL,
    "baseSeverity" TEXT,
    "metricsJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CvssSnapshot_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangeEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cveId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL,
    "diffJson" JSONB,
    CONSTRAINT "ChangeEvent_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KevFlag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cveId" TEXT NOT NULL,
    "firstSeen" DATETIME NOT NULL,
    "lastSeen" DATETIME,
    "remediationDue" DATETIME,
    CONSTRAINT "KevFlag_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EpssDaily" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cveId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "epss" REAL NOT NULL,
    "percentile" REAL NOT NULL,
    CONSTRAINT "EpssDaily_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IngestionState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastModCursor" DATETIME,
    "changeCursor" DATETIME
);
