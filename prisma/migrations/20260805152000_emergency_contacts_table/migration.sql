-- Several contacts per employee instead of one name/phone pair on users.
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "relation" TEXT,
    "phone" TEXT,
    "altPhone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "emergency_contacts"
    ADD CONSTRAINT "emergency_contacts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry the existing single contact over before the columns go, so nothing is lost.
INSERT INTO "emergency_contacts" ("id", "userId", "name", "phone", "isPrimary", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), "id", "emergencyContact", "emergencyContactPhone", true, 0, CURRENT_TIMESTAMP
FROM "users"
WHERE "emergencyContact" IS NOT NULL AND btrim("emergencyContact") <> '';

ALTER TABLE "users" DROP COLUMN "emergencyContact";
ALTER TABLE "users" DROP COLUMN "emergencyContactPhone";
