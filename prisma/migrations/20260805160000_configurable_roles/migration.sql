-- Roles become rows so an admin can add their own, each with its own permissions.
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_roles_key_key" ON "user_roles"("key");
CREATE UNIQUE INDEX "user_roles_name_key" ON "user_roles"("name");

CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "role_permissions_roleId_permission_key" ON "role_permissions"("roleId", "permission");
ALTER TABLE "role_permissions"
    ADD CONSTRAINT "role_permissions_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "user_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" ADD COLUMN "roleId" UUID;
ALTER TABLE "users"
    ADD CONSTRAINT "users_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "user_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed the five original roles, ranked as the old ROLE_HIERARCHY was, and point
-- every existing employee at the row matching the enum they already carry.
INSERT INTO "user_roles" ("id", "key", "name", "description", "rank", "color", "isSystem", "isDefault", "updatedAt") VALUES
  (gen_random_uuid(), 'ADMIN',     'Admin',     'Full access, including system settings and audit logs', 40, 'red',    true, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'HR',        'HR',        'Manages people, leave, assets and org structure',        30, 'purple', true, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'MANAGER',   'Manager',   'Sees and approves for their department',                 20, 'blue',   true, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'TEAM_LEAD', 'Team Lead', 'Sees and approves for their team',                       10, 'green',  true, false, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'EMPLOYEE',  'Employee',  'Self service only',                                       0, 'gray',   true, true,  CURRENT_TIMESTAMP);

UPDATE "users" u SET "roleId" = r.id
FROM "user_roles" r
WHERE r.key = u.role::text AND (u."roleId" IS NULL OR u."roleId" <> r.id);
