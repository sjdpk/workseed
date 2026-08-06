-- Grant each seeded role the permissions it had when the matrix lived in code
-- (src/lib/permissions.ts), so behaviour is unchanged by the move to rows.
INSERT INTO "role_permissions" ("id", "roleId", "permission")
SELECT gen_random_uuid(), r.id, p.permission
FROM "user_roles" r
CROSS JOIN (VALUES
  ('ASSET_ASSIGN'),
  ('ASSET_CREATE'),
  ('ASSET_DELETE'),
  ('ASSET_EDIT'),
  ('ASSET_RETURN'),
  ('ASSET_VIEW_ALL'),
  ('ASSET_VIEW_OWN'),
  ('AUDIT_LOG_VIEW'),
  ('BRANCH_CREATE'),
  ('BRANCH_DELETE'),
  ('BRANCH_EDIT'),
  ('BRANCH_VIEW'),
  ('DASHBOARD_VIEW_ALL_STATS'),
  ('DASHBOARD_VIEW_TEAM_STATS'),
  ('DEPARTMENT_CREATE'),
  ('DEPARTMENT_DELETE'),
  ('DEPARTMENT_EDIT'),
  ('DEPARTMENT_VIEW'),
  ('LEAVE_REQUEST_APPROVE'),
  ('LEAVE_REQUEST_CREATE_SELF'),
  ('LEAVE_REQUEST_VIEW_ALL'),
  ('LEAVE_REQUEST_VIEW_TEAM'),
  ('LEAVE_TYPE_CREATE'),
  ('LEAVE_TYPE_DELETE'),
  ('LEAVE_TYPE_EDIT'),
  ('LEAVE_TYPE_VIEW'),
  ('NOTIFICATION_LOG_VIEW'),
  ('NOTIFICATION_QUEUE_MANAGE'),
  ('NOTIFICATION_RULE_EDIT'),
  ('NOTIFICATION_RULE_VIEW'),
  ('NOTIFICATION_TEMPLATE_EDIT'),
  ('NOTIFICATION_TEMPLATE_VIEW'),
  ('REPORT_VIEW'),
  ('SETTINGS_EDIT'),
  ('SETTINGS_VIEW'),
  ('TEAM_CREATE'),
  ('TEAM_DELETE'),
  ('TEAM_EDIT'),
  ('TEAM_VIEW'),
  ('USER_CREATE'),
  ('USER_DELETE'),
  ('USER_EDIT'),
  ('USER_EDIT_SELF'),
  ('USER_VIEW_ALL'),
  ('USER_VIEW_TEAM')
) AS p(permission)
WHERE r.key = 'ADMIN'
ON CONFLICT ("roleId", "permission") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permission")
SELECT gen_random_uuid(), r.id, p.permission
FROM "user_roles" r
CROSS JOIN (VALUES
  ('ASSET_ASSIGN'),
  ('ASSET_CREATE'),
  ('ASSET_EDIT'),
  ('ASSET_RETURN'),
  ('ASSET_VIEW_ALL'),
  ('ASSET_VIEW_OWN'),
  ('BRANCH_CREATE'),
  ('BRANCH_EDIT'),
  ('BRANCH_VIEW'),
  ('DASHBOARD_VIEW_ALL_STATS'),
  ('DASHBOARD_VIEW_TEAM_STATS'),
  ('DEPARTMENT_CREATE'),
  ('DEPARTMENT_EDIT'),
  ('DEPARTMENT_VIEW'),
  ('LEAVE_REQUEST_APPROVE'),
  ('LEAVE_REQUEST_CREATE_SELF'),
  ('LEAVE_REQUEST_VIEW_ALL'),
  ('LEAVE_REQUEST_VIEW_TEAM'),
  ('LEAVE_TYPE_CREATE'),
  ('LEAVE_TYPE_EDIT'),
  ('LEAVE_TYPE_VIEW'),
  ('NOTIFICATION_LOG_VIEW'),
  ('NOTIFICATION_RULE_VIEW'),
  ('NOTIFICATION_TEMPLATE_VIEW'),
  ('REPORT_VIEW'),
  ('SETTINGS_VIEW'),
  ('TEAM_CREATE'),
  ('TEAM_EDIT'),
  ('TEAM_VIEW'),
  ('USER_CREATE'),
  ('USER_EDIT'),
  ('USER_EDIT_SELF'),
  ('USER_VIEW_ALL'),
  ('USER_VIEW_TEAM')
) AS p(permission)
WHERE r.key = 'HR'
ON CONFLICT ("roleId", "permission") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permission")
SELECT gen_random_uuid(), r.id, p.permission
FROM "user_roles" r
CROSS JOIN (VALUES
  ('ASSET_VIEW_OWN'),
  ('BRANCH_VIEW'),
  ('DASHBOARD_VIEW_TEAM_STATS'),
  ('DEPARTMENT_VIEW'),
  ('LEAVE_REQUEST_APPROVE'),
  ('LEAVE_REQUEST_CREATE_SELF'),
  ('LEAVE_REQUEST_VIEW_TEAM'),
  ('LEAVE_TYPE_VIEW'),
  ('REPORT_VIEW'),
  ('TEAM_VIEW'),
  ('USER_EDIT_SELF'),
  ('USER_VIEW_TEAM')
) AS p(permission)
WHERE r.key = 'MANAGER'
ON CONFLICT ("roleId", "permission") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permission")
SELECT gen_random_uuid(), r.id, p.permission
FROM "user_roles" r
CROSS JOIN (VALUES
  ('ASSET_VIEW_OWN'),
  ('BRANCH_VIEW'),
  ('DASHBOARD_VIEW_TEAM_STATS'),
  ('DEPARTMENT_VIEW'),
  ('LEAVE_REQUEST_APPROVE'),
  ('LEAVE_REQUEST_CREATE_SELF'),
  ('LEAVE_REQUEST_VIEW_TEAM'),
  ('LEAVE_TYPE_VIEW'),
  ('TEAM_VIEW'),
  ('USER_EDIT_SELF'),
  ('USER_VIEW_TEAM')
) AS p(permission)
WHERE r.key = 'TEAM_LEAD'
ON CONFLICT ("roleId", "permission") DO NOTHING;

INSERT INTO "role_permissions" ("id", "roleId", "permission")
SELECT gen_random_uuid(), r.id, p.permission
FROM "user_roles" r
CROSS JOIN (VALUES
  ('ASSET_VIEW_OWN'),
  ('BRANCH_VIEW'),
  ('DEPARTMENT_VIEW'),
  ('LEAVE_REQUEST_CREATE_SELF'),
  ('LEAVE_TYPE_VIEW'),
  ('TEAM_VIEW'),
  ('USER_EDIT_SELF')
) AS p(permission)
WHERE r.key = 'EMPLOYEE'
ON CONFLICT ("roleId", "permission") DO NOTHING;

