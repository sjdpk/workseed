"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Textarea,
  useConfirm,
  useToast,
} from "@/components";
import { PERMISSION_GROUPS, permissionLabel } from "@/lib/permission-catalog";

interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  rank: number;
  color: string | null;
  isSystem: boolean;
  isDefault: boolean;
  userCount: number;
  permissions: string[];
}

const COLORS = [
  { value: "gray", label: "Gray" },
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "red", label: "Red" },
];

const toneFor = (color: string | null) =>
  ({
    blue: "info" as const,
    green: "success" as const,
    purple: "accent" as const,
    orange: "warning" as const,
    red: "danger" as const,
  })[color || "gray"] ?? ("neutral" as const);

export default function RolesSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", description: "", rank: 5, color: "gray" });

  const load = useCallback(async () => {
    const res = await fetch("/api/roles");
    const data = await res.json();
    if (data.success) setRoles(data.data.roles);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((me) => {
        // the API enforces this too; the redirect just avoids a dead screen
        if (me.success && !me.data.user.permissions?.includes("SETTINGS_EDIT")) {
          router.replace("/dashboard");
          return;
        }
        load();
      });
  }, [router, load]);

  const patch = async (role: Role, body: Record<string, unknown>) => {
    setSavingId(role.id);
    try {
      const res = await fetch(`/api/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Could not save the role");
        return false;
      }
      await load();
      return true;
    } catch {
      toast.error("Something went wrong");
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const togglePermission = async (role: Role, permission: string) => {
    const next = role.permissions.includes(permission)
      ? role.permissions.filter((p) => p !== permission)
      : [...role.permissions, permission];
    // optimistic: the matrix is a lot of clicks, and a round trip per tick drags
    setRoles((rs) => rs.map((r) => (r.id === role.id ? { ...r, permissions: next } : r)));
    const ok = await patch(role, { permissions: next });
    if (!ok) setRoles((rs) => rs.map((r) => (r.id === role.id ? role : r)));
  };

  const create = async () => {
    if (draft.name.trim().length < 2) {
      toast.error("Give the role a name");
      return;
    }
    setSavingId("new");
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim() || undefined,
          rank: draft.rank,
          color: draft.color,
          // a new role starts with self-service only; grant the rest deliberately
          permissions: ["LEAVE_REQUEST_CREATE_SELF", "ASSET_VIEW_OWN"],
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Could not create the role");
        return;
      }
      toast.success(`${draft.name} created — now choose what it can do`);
      setDraft({ name: "", description: "", rank: 5, color: "gray" });
      setCreating(false);
      await load();
      setOpenId(data.data.role.id);
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (role: Role) => {
    const ok = await confirm({
      title: `Delete ${role.name}?`,
      message: "The role disappears from the list. Employees are not deleted.",
      confirmText: "Delete role",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.error || "Could not delete the role");
      return;
    }
    toast.success(`${role.name} deleted`);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles"
        subtitle="Add the roles your company actually uses, and choose what each one can see and do."
        actions={
          <Button onClick={() => setCreating((c) => !c)} variant={creating ? "outline" : "primary"}>
            {creating ? "Cancel" : "Add role"}
          </Button>
        }
      />

      {creating && (
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New role</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Name"
              placeholder="Senior Team Lead"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Input
              label="Seniority"
              type="number"
              min={0}
              max={100}
              hint="Higher outranks lower. Employee is 0, Admin is 40."
              value={draft.rank}
              onChange={(e) => setDraft({ ...draft, rank: parseInt(e.target.value || "0", 10) })}
            />
            <Select
              label="Badge colour"
              options={COLORS}
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            />
            <Textarea
              label="Description"
              rows={2}
              placeholder="What this role is for"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            New roles start with self-service only — apply for leave and see their own assets. Add
            the rest below once it exists.
          </p>
          <div>
            <Button onClick={create} disabled={savingId === "new"}>
              {savingId === "new" ? "Creating…" : "Create role"}
            </Button>
          </div>
        </Card>
      )}

      {roles.length === 0 ? (
        <EmptyState title="No roles yet" description="Add the first role to get started." />
      ) : (
        <div className="space-y-3">
          {roles.map((role) => {
            const open = openId === role.id;
            return (
              <Card key={role.id} className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {role.name}
                      </h2>
                      <Badge tone={toneFor(role.color)}>
                        {role.permissions.length} permissions
                      </Badge>
                      {role.isSystem && <Badge>Built in</Badge>}
                      {role.isDefault && <Badge tone="info">New employees</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {role.description || "No description"} · seniority {role.rank} ·{" "}
                      {role.userCount} {role.userCount === 1 ? "employee" : "employees"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenId(open ? null : role.id)}
                    >
                      {open ? "Done" : "Permissions"}
                    </Button>
                    {!role.isSystem && (
                      <Button variant="ghost" size="sm" onClick={() => remove(role)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                {open && (
                  <div className="space-y-5 border-t border-gray-200 pt-4 dark:border-gray-800">
                    {role.key === "ADMIN" && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Admin always keeps every permission, so a company cannot lock itself out.
                      </p>
                    )}
                    {PERMISSION_GROUPS.map((group) => (
                      <div key={group.group}>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {group.group}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {group.permissions.map((permission) => (
                            <label
                              key={permission}
                              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                            >
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                                checked={role.permissions.includes(permission)}
                                disabled={role.key === "ADMIN" || savingId === role.id}
                                onChange={() => togglePermission(role, permission)}
                              />
                              {permissionLabel(permission)}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}

                    {!role.isSystem && (
                      <div className="grid gap-4 border-t border-gray-200 pt-4 dark:border-gray-800 sm:grid-cols-3">
                        <Input
                          label="Name"
                          defaultValue={role.name}
                          onBlur={(e) =>
                            e.target.value !== role.name && patch(role, { name: e.target.value })
                          }
                        />
                        <Input
                          label="Seniority"
                          type="number"
                          defaultValue={role.rank}
                          onBlur={(e) =>
                            parseInt(e.target.value, 10) !== role.rank &&
                            patch(role, { rank: parseInt(e.target.value, 10) })
                          }
                        />
                        <Select
                          label="Badge colour"
                          options={COLORS}
                          value={role.color || "gray"}
                          onChange={(e) => patch(role, { color: e.target.value })}
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                        checked={role.isDefault}
                        onChange={() => patch(role, { isDefault: !role.isDefault })}
                      />
                      Give this role to new employees by default
                    </label>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
