/**
 * Runtime authorization.
 *
 * Roles used to be a Prisma enum and permissions lived in two places that did not
 * agree: a static matrix in `permissions.ts` (enforced on asset and notification
 * routes only) and a `roleAccess` blob in organization settings (enforced on two
 * other routes). Everything else was a hand-written `["ADMIN","HR"].includes(...)`.
 *
 * Now a role is a row in `user_roles` with its own `role_permissions`, and this
 * module is the single place that answers "may this user do that". The five
 * original roles are seeded with `isSystem = true`, so a company can add roles
 * without ever being able to lock itself out.
 */
import {
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  permissionLabel,
  seedPermissionsFor,
} from "./permission-catalog";
import { PERMISSIONS, type Permission } from "./permissions";
import { prisma } from "./prisma";

export { ALL_PERMISSIONS, PERMISSION_GROUPS, permissionLabel, seedPermissionsFor };

export type { Permission } from "./permissions";

export interface ResolvedRole {
  id: string;
  key: string;
  name: string;
  rank: number;
  color: string | null;
  isSystem: boolean;
  permissions: Set<string>;
}

/* Roles change rarely and are read on nearly every request, so they are cached
   briefly. A short TTL means a permission change takes effect within seconds
   without a redeploy or a re-login. */
const CACHE_TTL_MS = 10_000;
let cache: {
  at: number;
  byId: Map<string, ResolvedRole>;
  byKey: Map<string, ResolvedRole>;
} | null = null;

async function loadRoles() {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache;
  const rows = await prisma.userRole.findMany({
    include: { permissions: { select: { permission: true } } },
    orderBy: { rank: "desc" },
  });
  const byId = new Map<string, ResolvedRole>();
  const byKey = new Map<string, ResolvedRole>();
  for (const row of rows) {
    const resolved: ResolvedRole = {
      id: row.id,
      key: row.key,
      name: row.name,
      rank: row.rank,
      color: row.color,
      isSystem: row.isSystem,
      permissions: new Set(row.permissions.map((p) => p.permission)),
    };
    byId.set(row.id, resolved);
    byKey.set(row.key, resolved);
  }
  cache = { at: Date.now(), byId, byKey };
  return cache;
}

/** Call after any write to roles or their permissions. */
export function invalidateRoleCache() {
  cache = null;
}

export async function listRoles(): Promise<ResolvedRole[]> {
  const { byId } = await loadRoles();
  return [...byId.values()].sort((a, b) => b.rank - a.rank);
}

/** Accepts either shape of user: the new `roleId` or the legacy enum `role`. */
export async function resolveRole(user: {
  roleId?: string | null;
  role?: string | null;
}): Promise<ResolvedRole | null> {
  const { byId, byKey } = await loadRoles();
  if (user.roleId && byId.has(user.roleId)) return byId.get(user.roleId)!;
  if (user.role && byKey.has(user.role)) return byKey.get(user.role)!;
  return null;
}

/**
 * The one authorization question. Falls back to the static matrix only when a
 * user has no resolvable role at all, so a half-migrated row is denied rather
 * than silently granted.
 */
export async function can(
  user: { roleId?: string | null; role?: string | null } | null | undefined,
  permission: Permission | string
): Promise<boolean> {
  if (!user) return false;
  const role = await resolveRole(user);
  // a seeded role with no grants means the permission seed has not run — fall back
  // rather than locking the company out of its own instance
  if (role && !(role.isSystem && role.permissions.size === 0)) {
    return role.permissions.has(permission);
  }
  const staticRoles = (PERMISSIONS as Record<string, readonly string[]>)[permission];
  return !!user.role && !!staticRoles?.includes(user.role);
}

/** True if every permission is granted. */
export async function canAll(
  user: { roleId?: string | null; role?: string | null } | null | undefined,
  permissions: (Permission | string)[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await can(user, permission))) return false;
  }
  return true;
}

/** True if any is granted. */
export async function canAny(
  user: { roleId?: string | null; role?: string | null } | null | undefined,
  permissions: (Permission | string)[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await can(user, permission)) return true;
  }
  return false;
}

/** Every permission a user holds — for `/api/auth/me`, so the UI can hide what
 *  the API would refuse instead of guessing from a role name. */
export async function permissionsFor(
  user: { roleId?: string | null; role?: string | null } | null | undefined
): Promise<string[]> {
  if (!user) return [];
  const role = await resolveRole(user);
  if (role && !(role.isSystem && role.permissions.size === 0)) return [...role.permissions];
  return Object.entries(PERMISSIONS)
    .filter(([, roles]) => !!user.role && (roles as readonly string[]).includes(user.role))
    .map(([permission]) => permission);
}

/**
 * The legacy `users.role` enum can only hold the five original values, but a
 * custom role has its own key. Until every reader has moved to `roleId`, a custom
 * role is written to the enum as the tier its seniority sits in, so untouched code
 * treats "Senior Team Lead" (rank 15) as a TEAM_LEAD rather than crashing.
 */
export function legacyRoleFor(role: {
  key: string;
  rank: number;
}): "ADMIN" | "HR" | "MANAGER" | "TEAM_LEAD" | "EMPLOYEE" {
  const system = ["ADMIN", "HR", "MANAGER", "TEAM_LEAD", "EMPLOYEE"] as const;
  if ((system as readonly string[]).includes(role.key)) {
    return role.key as (typeof system)[number];
  }
  if (role.rank >= 40) return "ADMIN";
  if (role.rank >= 30) return "HR";
  if (role.rank >= 20) return "MANAGER";
  if (role.rank >= 10) return "TEAM_LEAD";
  return "EMPLOYEE";
}

/** Seniority comparison, replacing the hardcoded ROLE_HIERARCHY. */
export async function outranks(
  actor: { roleId?: string | null; role?: string | null },
  target: { roleId?: string | null; role?: string | null }
): Promise<boolean> {
  const [a, b] = await Promise.all([resolveRole(actor), resolveRole(target)]);
  return (a?.rank ?? -1) > (b?.rank ?? -1);
}
