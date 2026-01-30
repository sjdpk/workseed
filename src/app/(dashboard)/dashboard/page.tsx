"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components";

interface Stats {
  totalUsers: number;
  totalBranches: number;
  activeUsers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBranches: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/users?limit=1").then((r) => r.json()),
      fetch("/api/branches").then((r) => r.json()),
    ]).then(([usersData, branchesData]) => {
      setStats({
        totalUsers: usersData.data?.pagination?.total || 0,
        totalBranches: branchesData.data?.branches?.length || 0,
        activeUsers: usersData.data?.pagination?.total || 0,
      });
    });
  }, []);

  const statCards = [
    {
      name: "Total Users",
      value: stats.totalUsers,
      icon: UsersIcon,
      color: "bg-blue-600",
    },
    {
      name: "Branches",
      value: stats.totalBranches,
      icon: BuildingIcon,
      color: "bg-green-600",
    },
    {
      name: "Active Users",
      value: stats.activeUsers,
      icon: ActiveIcon,
      color: "bg-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Welcome to the HRM System
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.name} className="flex items-center gap-4">
            <div className={`rounded-md p-2.5 ${stat.color}`}>
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stat.name}
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            href="/dashboard/users"
            icon={UsersIcon}
            title="Manage Users"
            description="View and manage all users"
          />
          <QuickAction
            href="/dashboard/branches"
            icon={BuildingIcon}
            title="Manage Branches"
            description="View and manage branches"
          />
        </div>
      </Card>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
    >
      <div className="rounded-md bg-gray-100 p-2 dark:bg-gray-700">
        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </a>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function ActiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
