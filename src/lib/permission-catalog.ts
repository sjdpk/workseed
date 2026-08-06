/**
 * The permission vocabulary — every capability an admin can grant a role, grouped
 * the way the Roles screen shows them.
 *
 * Deliberately free of database imports so the admin UI (a client component) can
 * render the matrix; the runtime checks live in `src/lib/rbac.ts`.
 */
import { PERMISSIONS, type Permission } from "./permissions";

export const PERMISSION_GROUPS: { group: string; permissions: Permission[] }[] = [
  {
    group: "People",
    permissions: [
      "USER_VIEW_ALL",
      "USER_VIEW_TEAM",
      "USER_CREATE",
      "USER_EDIT",
      "USER_DELETE",
      "USER_EDIT_SELF",
    ],
  },
  {
    group: "Organisation",
    permissions: [
      "DEPARTMENT_VIEW",
      "DEPARTMENT_CREATE",
      "DEPARTMENT_EDIT",
      "DEPARTMENT_DELETE",
      "TEAM_VIEW",
      "TEAM_CREATE",
      "TEAM_EDIT",
      "TEAM_DELETE",
      "BRANCH_VIEW",
      "BRANCH_CREATE",
      "BRANCH_EDIT",
      "BRANCH_DELETE",
    ],
  },
  {
    group: "Leave",
    permissions: [
      "LEAVE_TYPE_VIEW",
      "LEAVE_TYPE_CREATE",
      "LEAVE_TYPE_EDIT",
      "LEAVE_TYPE_DELETE",
      "LEAVE_REQUEST_VIEW_ALL",
      "LEAVE_REQUEST_VIEW_TEAM",
      "LEAVE_REQUEST_APPROVE",
      "LEAVE_REQUEST_CREATE_SELF",
    ],
  },
  {
    group: "Attendance",
    permissions: ["ATTENDANCE_VIEW_TEAM", "ATTENDANCE_MANAGE", "ATTENDANCE_DEVICE_MANAGE"],
  },
  {
    group: "Assets",
    permissions: [
      "ASSET_VIEW_ALL",
      "ASSET_VIEW_OWN",
      "ASSET_CREATE",
      "ASSET_EDIT",
      "ASSET_DELETE",
      "ASSET_ASSIGN",
      "ASSET_RETURN",
    ],
  },
  {
    group: "Notifications",
    permissions: [
      "NOTIFICATION_TEMPLATE_VIEW",
      "NOTIFICATION_TEMPLATE_EDIT",
      "NOTIFICATION_RULE_VIEW",
      "NOTIFICATION_RULE_EDIT",
      "NOTIFICATION_LOG_VIEW",
      "NOTIFICATION_QUEUE_MANAGE",
    ],
  },
  {
    group: "Reporting & settings",
    permissions: [
      "DASHBOARD_VIEW_ALL_STATS",
      "DASHBOARD_VIEW_TEAM_STATS",
      "REPORT_VIEW",
      "AUDIT_LOG_VIEW",
      "SETTINGS_VIEW",
      "SETTINGS_EDIT",
    ],
  },
];

export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((g) => g.permissions);

/** What a seeded system role is granted — the old static matrix, plus the two
 *  permissions that previously had no key at all. */
export function seedPermissionsFor(roleKey: string): string[] {
  const extra: Record<string, string[]> = {
    ADMIN: ["REPORT_VIEW", "AUDIT_LOG_VIEW"],
    HR: ["REPORT_VIEW"],
    MANAGER: ["REPORT_VIEW"],
  };
  const fromMatrix = Object.entries(PERMISSIONS)
    .filter(([, roles]) => (roles as readonly string[]).includes(roleKey))
    .map(([permission]) => permission);
  return [...new Set([...fromMatrix, ...(extra[roleKey] ?? [])])];
}

/** Human wording for a permission key, used by the Roles matrix. */
export function permissionLabel(permission: string): string {
  const [subject, ...rest] = permission.split("_");
  const action = rest.join(" ").toLowerCase();
  const subjects: Record<string, string> = {
    USER: "Employees",
    DEPARTMENT: "Departments",
    TEAM: "Teams",
    BRANCH: "Branches",
    LEAVE: "Leave",
    ASSET: "Assets",
    NOTIFICATION: "Notifications",
    DASHBOARD: "Dashboard",
    REPORT: "Reports",
    AUDIT: "Audit log",
    SETTINGS: "Settings",
  };
  return `${subjects[subject] ?? subject}: ${action.replace(/\btype\b/, "types")}`;
}
