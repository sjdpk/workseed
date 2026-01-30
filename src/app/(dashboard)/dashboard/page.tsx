"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components";

interface Stats {
  totalUsers: number;
  totalBranches: number;
  totalDepartments: number;
  pendingLeaves: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBranches: 0,
    totalDepartments: 0,
    pendingLeaves: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/users?limit=1").then((r) => r.json()),
      fetch("/api/branches").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/leave-requests?pending=true").then((r) => r.json()),
    ]).then(([usersData, branchesData, deptData, leavesData]) => {
      setStats({
        totalUsers: usersData.data?.pagination?.total || 0,
        totalBranches: branchesData.data?.branches?.length || 0,
        totalDepartments: deptData.data?.departments?.length || 0,
        pendingLeaves: leavesData.data?.leaveRequests?.length || 0,
      });
      setLoading(false);
    });
  }, []);

  const statCards = [
    { name: "Total Users", value: stats.totalUsers, href: "/dashboard/users", icon: UsersIcon, color: "bg-blue-600" },
    { name: "Departments", value: stats.totalDepartments, href: "/dashboard/departments", icon: BuildingIcon, color: "bg-green-600" },
    { name: "Branches", value: stats.totalBranches, href: "/dashboard/branches", icon: LocationIcon, color: "bg-purple-600" },
    { name: "Pending Leaves", value: stats.pendingLeaves, href: "/dashboard/leaves/requests", icon: ClockIcon, color: "bg-orange-600" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Welcome to the HRM System</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="flex items-center gap-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer">
              <div className={`rounded-md p-2.5 ${stat.color}`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/dashboard/users/new" icon={UsersIcon} title="Add User" description="Create new employee" />
          <QuickAction href="/dashboard/departments/new" icon={BuildingIcon} title="Add Department" description="Create department" />
          <QuickAction href="/dashboard/teams/new" icon={TeamIcon} title="Add Team" description="Create new team" />
          <QuickAction href="/dashboard/leaves" icon={CalendarIcon} title="Apply Leave" description="Request time off" />
        </div>
      </Card>
    </div>
  );
}

function QuickAction({ href, icon: Icon, title, description }: { href: string; icon: React.ComponentType<{ className?: string }>; title: string; description: string }) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
      <div className="rounded-md bg-gray-100 p-2 dark:bg-gray-700">
        <Icon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </Link>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}

function BuildingIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
}

function LocationIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}

function ClockIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}

function TeamIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
}

function CalendarIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
