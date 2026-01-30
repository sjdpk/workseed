"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components";

interface Team {
  id: string;
  name: string;
  code: string;
  description?: string;
  department?: { id: string; name: string };
  _count: { users: number };
}

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTeams(data.data.teams);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Teams</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage organization teams</p>
        </div>
        <Button onClick={() => router.push("/dashboard/teams/new")}>Add Team</Button>
      </div>

      {teams.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">No teams found</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{team.name}</h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{team.code}</span>
                </div>
              </div>
              {team.description && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{team.description}</p>}
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">{team._count.users} members</div>
              {team.department && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Department: {team.department.name}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
