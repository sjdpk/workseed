"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Input } from "@/components";

interface User {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  designation?: string;
  phone?: string;
  department?: { id: string; name: string };
  team?: { id: string; name: string };
}

export default function DirectoryPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [scope, setScope] = useState<string>("none");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users/directory")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setUsers(data.data.users);
          setScope(data.data.scope);
        } else if (data.error === "Use Users page for admin access") {
          router.replace("/dashboard/users");
        } else {
          setError(data.error || "Failed to load directory");
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load directory");
        setLoading(false);
      });
  }, [router]);

  const filteredUsers = users.filter((user) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(term) ||
      user.lastName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.designation?.toLowerCase().includes(term)
    );
  });

  const scopeText = {
    team: "team members",
    department: "department colleagues",
    all: "all employees",
    none: "colleagues",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Directory</h1>
        <Card>
          <div className="py-8 text-center">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Directory</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          View your {scopeText[scope as keyof typeof scopeText] || "colleagues"}
        </p>
      </div>

      {users.length > 0 && (
        <Card className="p-3">
          <Input
            id="search"
            placeholder="Search by name, email, or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Card>
      )}

      {filteredUsers.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? "No colleagues found matching your search" : "No colleagues to display"}
            </p>
            {scope === "none" && !searchTerm && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                You may not be assigned to a team or department yet.
              </p>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                {user.designation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{user.designation}</p>
                )}
                <div className="mt-2 space-y-1">
                  <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{user.email}</span>
                  </p>
                  {user.phone && (
                    <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      {user.phone}
                    </p>
                  )}
                  {user.department && (
                    <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {user.department.name}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredUsers.length > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Showing {filteredUsers.length} {filteredUsers.length === 1 ? "colleague" : "colleagues"}
        </p>
      )}
    </div>
  );
}
