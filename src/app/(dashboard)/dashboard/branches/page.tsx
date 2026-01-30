"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components";
import type { Branch } from "@/types";

interface CurrentUser {
  role: string;
}

const PERMISSIONS = {
  VIEW: ["ADMIN", "HR"],
  CREATE: ["ADMIN", "HR"],
};

export default function BranchesPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const hasPermission = (permission: keyof typeof PERMISSIONS) => {
    if (!currentUser) return false;
    return PERMISSIONS[permission].includes(currentUser.role);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/branches").then(r => r.json()),
    ]).then(([meData, branchesData]) => {
      if (meData.success) {
        setCurrentUser(meData.data.user);
        if (!PERMISSIONS.VIEW.includes(meData.data.user.role)) {
          router.replace("/dashboard");
          return;
        }
      }
      if (branchesData.success) setBranches(branchesData.data.branches);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!hasPermission("VIEW")) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Branches</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage company branches</p>
        </div>
        {hasPermission("CREATE") && (
          <Button onClick={() => router.push("/dashboard/branches/new")}>Add Branch</Button>
        )}
      </div>

      {branches.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">No branches found</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{branch.name}</h3>
                  <span className="mt-1 inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">{branch.code}</span>
                </div>
                <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${branch.isActive ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                  {branch.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              {(branch.address || branch.city) && (
                <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                  {[branch.address, branch.city, branch.state, branch.country].filter(Boolean).join(", ")}
                </p>
              )}
              {(branch.phone || branch.email) && (
                <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  {branch.phone && <p>{branch.phone}</p>}
                  {branch.email && <p>{branch.email}</p>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
