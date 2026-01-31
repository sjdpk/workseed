// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY = {
  EMPLOYEE: 0,
  TEAM_LEAD: 1,
  MANAGER: 2,
  HR: 3,
  ADMIN: 4,
} as const;

export type Role = keyof typeof ROLE_HIERARCHY;

// Permission definitions
export const PERMISSIONS = {
  // User management
  USER_VIEW_ALL: ["ADMIN", "HR"],
  USER_VIEW_TEAM: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"],
  USER_CREATE: ["ADMIN", "HR"],
  USER_EDIT: ["ADMIN", "HR"],
  USER_DELETE: ["ADMIN"],
  USER_EDIT_SELF: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"],

  // Department management
  DEPARTMENT_VIEW: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"],
  DEPARTMENT_CREATE: ["ADMIN", "HR"],
  DEPARTMENT_EDIT: ["ADMIN", "HR"],
  DEPARTMENT_DELETE: ["ADMIN"],

  // Team management
  TEAM_VIEW: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"],
  TEAM_CREATE: ["ADMIN", "HR"],
  TEAM_EDIT: ["ADMIN", "HR"],
  TEAM_DELETE: ["ADMIN"],

  // Branch management
  BRANCH_VIEW: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"],
  BRANCH_CREATE: ["ADMIN", "HR"],
  BRANCH_EDIT: ["ADMIN", "HR"],
  BRANCH_DELETE: ["ADMIN"],

  // Leave type management
  LEAVE_TYPE_VIEW: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"],
  LEAVE_TYPE_CREATE: ["ADMIN", "HR"],
  LEAVE_TYPE_EDIT: ["ADMIN", "HR"],
  LEAVE_TYPE_DELETE: ["ADMIN"],

  // Leave request management
  LEAVE_REQUEST_VIEW_ALL: ["ADMIN", "HR"],
  LEAVE_REQUEST_VIEW_TEAM: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"],
  LEAVE_REQUEST_APPROVE: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"],
  LEAVE_REQUEST_CREATE_SELF: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"],

  // Settings
  SETTINGS_VIEW: ["ADMIN", "HR"],
  SETTINGS_EDIT: ["ADMIN"],

  // Dashboard stats
  DASHBOARD_VIEW_ALL_STATS: ["ADMIN", "HR"],
  DASHBOARD_VIEW_TEAM_STATS: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"],

  // Asset management
  ASSET_VIEW_ALL: ["ADMIN", "HR"],
  ASSET_VIEW_OWN: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"], // Can see own assigned assets
  ASSET_CREATE: ["ADMIN", "HR"],
  ASSET_EDIT: ["ADMIN", "HR"],
  ASSET_DELETE: ["ADMIN"],
  ASSET_ASSIGN: ["ADMIN", "HR"],
  ASSET_RETURN: ["ADMIN", "HR"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Check if a role has a specific permission
export function hasPermission(role: string, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

// Check if user has any of the specified permissions
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

// Check if user has all of the specified permissions
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  return permissions.every((permission) => hasPermission(role, permission));
}

// Check if role A is higher than or equal to role B
export function isRoleHigherOrEqual(roleA: string, roleB: string): boolean {
  return (ROLE_HIERARCHY[roleA as Role] ?? 0) >= (ROLE_HIERARCHY[roleB as Role] ?? 0);
}

// Check if role A is strictly higher than role B
export function isRoleHigher(roleA: string, roleB: string): boolean {
  return (ROLE_HIERARCHY[roleA as Role] ?? 0) > (ROLE_HIERARCHY[roleB as Role] ?? 0);
}

// Get navigation items based on role
export function getNavigationPermissions(role: string) {
  return {
    canViewUsers: hasPermission(role, "USER_VIEW_ALL") || hasPermission(role, "USER_VIEW_TEAM"),
    canManageUsers: hasPermission(role, "USER_CREATE"),
    canViewDepartments: hasPermission(role, "DEPARTMENT_VIEW"),
    canManageDepartments: hasPermission(role, "DEPARTMENT_CREATE"),
    canViewTeams: hasPermission(role, "TEAM_VIEW"),
    canManageTeams: hasPermission(role, "TEAM_CREATE"),
    canViewBranches: hasPermission(role, "BRANCH_VIEW"),
    canManageBranches: hasPermission(role, "BRANCH_CREATE"),
    canViewLeaveTypes: hasPermission(role, "LEAVE_TYPE_VIEW"),
    canManageLeaveTypes: hasPermission(role, "LEAVE_TYPE_CREATE"),
    canApproveLeaves: hasPermission(role, "LEAVE_REQUEST_APPROVE"),
    canViewSettings: hasPermission(role, "SETTINGS_VIEW"),
    canViewAllStats: hasPermission(role, "DASHBOARD_VIEW_ALL_STATS"),
    canViewAssets: hasPermission(role, "ASSET_VIEW_ALL"),
    canManageAssets: hasPermission(role, "ASSET_CREATE"),
    canViewOwnAssets: hasPermission(role, "ASSET_VIEW_OWN"),
  };
}
