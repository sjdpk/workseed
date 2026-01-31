"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components";

interface Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  department?: { id: string; name: string };
  lead?: { id: string; firstName: string; lastName: string };
  _count: { users: number };
}

interface CurrentUser {
  role: string;
}

const PERMISSIONS = {
  VIEW: ["ADMIN", "HR"],
  CREATE: ["ADMIN", "HR"],
};

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const hasPermission = (permission: keyof typeof PERMISSIONS) => {
    if (!currentUser) return false;
    return PERMISSIONS[permission].includes(currentUser.role);
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch("/api/teams").then(r => r.json()),
    ]).then(([meData, teamsData]) => {
      if (meData.success) {
        setCurrentUser(meData.data.user);
        if (!PERMISSIONS.VIEW.includes(meData.data.user.role)) {
          router.replace("/dashboard");
          return;
        }
      }
      if (teamsData.success) setTeams(teamsData.data.teams);
      setLoading(false);
    });
  }, [router]);

  const filteredTeams = teams.filter((team) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      team.name.toLowerCase().includes(term) ||
      team.code.toLowerCase().includes(term) ||
      team.description?.toLowerCase().includes(term) ||
      team.department?.name?.toLowerCase().includes(term)
    );
  });

  const exportToCSV = () => {
    const headers = ["Name", "Code", "Description", "Department", "Lead", "Members"];
    const rows = filteredTeams.map(team => [
      team.name,
      team.code,
      team.description || "",
      team.department?.name || "",
      team.lead ? `${team.lead.firstName} ${team.lead.lastName}` : "",
      team._count.users,
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `teams_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
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
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Teams</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage organization teams</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportToCSV}>Export CSV</Button>
          {hasPermission("CREATE") && (
            <Button onClick={() => router.push("/dashboard/teams/new")}>Add Team</Button>
          )}
        </div>
      </div>

      <Card className="p-3">
        <Input
          id="search"
          placeholder="Search by name, code, or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Card>

      {filteredTeams.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">No teams found</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <Card key={team.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{team.code}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/teams/${team.id}`)}
                >
                  Edit
                </Button>
              </div>
              {team.description && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{team.description}</p>}
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">{team._count.users} members</span>
                {team.lead ? (
                  <span className="rounded bg-green-100 px-2 py-0.5 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Lead: {team.lead.firstName} {team.lead.lastName}
                  </span>
                ) : (
                  <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    No Lead
                  </span>
                )}
              </div>
              {team.department && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Department: {team.department.name}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
