-- AlterTable
ALTER TABLE "users" ADD COLUMN "deviceUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_deviceUserId_key" ON "users"("deviceUserId");
