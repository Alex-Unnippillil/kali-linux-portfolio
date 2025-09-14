-- CreateTable
CREATE TABLE "PushSubscription" (
    "endpoint" TEXT NOT NULL PRIMARY KEY,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL
);
