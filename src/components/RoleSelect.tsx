"use client";

import { useEffect, useState } from "react";
import { Select } from "./Select";

export interface RoleOption {
  id: string;
  key: string;
  name: string;
  rank: number;
  color: string | null;
  isSystem: boolean;
  isDefault: boolean;
}

let cached: RoleOption[] | null = null;

/** Roles are shared across several screens and change rarely, so the first fetch
 *  is reused. `/api/roles` is readable by anyone signed in. */
export function useRoles(): { roles: RoleOption[]; loading: boolean } {
  const [roles, setRoles] = useState<RoleOption[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    let active = true;
    fetch("/api/roles")
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data?.success) return;
        cached = data.data.roles;
        setRoles(data.data.roles);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { roles, loading };
}

/** Clears the cache after an admin edits the roster. */
export function invalidateRoleOptions() {
  cached = null;
}

/**
 * Role picker fed from the database, replacing the hardcoded five-option lists in
 * the create and edit screens. `maxRank` hides roles more senior than the person
 * doing the assigning — the API enforces the same rule.
 */
export function RoleSelect({
  value,
  onChange,
  label = "Role",
  maxRank,
  disabled,
  id = "roleId",
}: {
  /** Role id. A legacy enum key is accepted and resolved to its row. */
  value: string;
  onChange: (roleId: string, role: RoleOption) => void;
  label?: string;
  maxRank?: number;
  disabled?: boolean;
  id?: string;
}) {
  const { roles, loading } = useRoles();

  const visible = roles.filter((r) => maxRank === undefined || r.rank <= maxRank);
  const selected =
    roles.find((r) => r.id === value) ?? roles.find((r) => r.key === value) ?? visible[0];

  return (
    <Select
      id={id}
      label={label}
      disabled={disabled || loading}
      options={visible.map((r) => ({ value: r.id, label: r.name }))}
      value={selected?.id ?? ""}
      onChange={(e) => {
        const role = roles.find((r) => r.id === e.target.value);
        if (role) onChange(role.id, role);
      }}
    />
  );
}
