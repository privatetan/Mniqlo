-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TaskLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "taskId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" TEXT NOT NULL,
    CONSTRAINT "TaskLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MonitorTask" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TaskLog" ("id", "message", "status", "taskId", "timestamp") SELECT "id", "message", "status", "taskId", "timestamp" FROM "TaskLog";
DROP TABLE "TaskLog";
ALTER TABLE "new_TaskLog" RENAME TO "TaskLog";
CREATE TABLE "new_NotificationLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "style" TEXT,
    "size" TEXT,
    "timestamp" TEXT NOT NULL,
    CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_NotificationLog" ("id", "productId", "size", "style", "timestamp", "userId") SELECT "id", "productId", "size", "style", "timestamp", "userId" FROM "NotificationLog";
DROP TABLE "NotificationLog";
ALTER TABLE "new_NotificationLog" RENAME TO "NotificationLog";
CREATE INDEX "NotificationLog_userId_productId_timestamp_idx" ON "NotificationLog"("userId", "productId", "timestamp" DESC);
CREATE TABLE "new_MonitorTask" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "style" TEXT,
    "size" TEXT,
    "targetPrice" REAL,
    "frequency" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "lastPushTime" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MonitorTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_MonitorTask" ("createdAt", "endTime", "frequency", "id", "isActive", "lastPushTime", "productId", "size", "startTime", "style", "targetPrice", "updatedAt", "userId") SELECT "createdAt", "endTime", "frequency", "id", "isActive", "lastPushTime", "productId", "size", "startTime", "style", "targetPrice", "updatedAt", "userId" FROM "MonitorTask";
DROP TABLE "MonitorTask";
ALTER TABLE "new_MonitorTask" RENAME TO "MonitorTask";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
