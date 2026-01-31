"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle, Button, ToastProvider } from "@/components";
import type { SessionUser } from "@/types";


interface OrgSettings {
  name: string;
  logoUrl: string | null;
  theme?: {
    accentColor: string;
    darkMode: "system" | "light" | "dark";
  };
  permissions?: {
    roleAccess?: {
      users?: string[];
      departments?: string[];
      teams?: string[];
      branches?: string[];
      leaveTypes?: string[];
      leaveRequests?: string[];
      auditLogs?: string[];
      reports?: string[];
    };
    employeesCanViewTeamLeaves?: boolean;
    employeesCanViewDepartmentLeaves?: boolean;
  };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((res) => res.json()),
      fetch("/api/organization").then((res) => res.json()),
    ])
      .then(([authData, orgData]) => {
        if (!authData.success) {
          router.push("/login");
        } else {
          setUser(authData.data.user);
        }
        if (orgData.success) {
          setOrgSettings(orgData.data.settings);
          // Apply organization theme
          if (orgData.data.settings.theme?.accentColor) {
            document.documentElement.setAttribute("data-accent", orgData.data.settings.theme.accentColor);
          }
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Check role access from organization settings
  const hasRoleAccess = (feature: string) => {
    if (!user) return false;

    // Default permissions if not configured
    const defaults: Record<string, string[]> = {
      users: ["ADMIN", "HR"],
      departments: ["ADMIN", "HR"],
      teams: ["ADMIN", "HR"],
      branches: ["ADMIN", "HR"],
      leaveTypes: ["ADMIN", "HR"],
      leaveRequests: ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"],
      auditLogs: ["ADMIN"],
      reports: ["ADMIN", "HR", "MANAGER"],
    };

    const roleAccess = orgSettings?.permissions?.roleAccess;
    // Use configured roles if available, otherwise use defaults
    const allowedRoles = roleAccess?.[feature as keyof typeof roleAccess] ?? defaults[feature] ?? [];
    return allowedRoles.includes(user.role);
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  // Build navigation based on permissions
  const isHROrAbove = ["ADMIN", "HR"].includes(user?.role || "");

  // Check if employee can view team/department leaves
  const canViewTeamLeaves = orgSettings?.permissions?.employeesCanViewTeamLeaves === true && user?.teamId;
  const canViewDeptLeaves = orgSettings?.permissions?.employeesCanViewDepartmentLeaves === true && user?.departmentId;
  const canViewWhosOut = canViewTeamLeaves || canViewDeptLeaves;

  // MAIN - Core daily work (different for HR vs Employee)
  const mainNavigation = isHROrAbove ? [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon, show: true },
    { name: "Users", href: "/dashboard/users", icon: UsersIcon, show: hasRoleAccess("users") },
    { name: "Leave Requests", href: "/dashboard/leaves/requests", icon: ClockIcon, show: hasRoleAccess("leaveRequests") },
  ].filter(item => item.show) : [
    { name: "Dashboard", href: "/dashboard", icon: HomeIcon, show: true },
    { name: "My Profile", href: "/dashboard/profile", icon: UserIcon, show: true },
    { name: "Directory", href: "/dashboard/directory", icon: ContactIcon, show: true },
    { name: "Announcements", href: "/dashboard/announcements", icon: MegaphoneIcon, show: true },
  ].filter(item => item.show);

  // ORGANIZATION - Structure management (HR only)
  const orgNavigation = [
    { name: "Departments", href: "/dashboard/departments", icon: BuildingIcon, show: hasRoleAccess("departments") },
    { name: "Teams", href: "/dashboard/teams", icon: TeamIcon, show: hasRoleAccess("teams") },
    { name: "Branches", href: "/dashboard/branches", icon: LocationIcon, show: hasRoleAccess("branches") },
  ].filter(item => item.show);

  // LEAVE - Leave management
  const leaveNavigation = isHROrAbove ? [
    { name: "My Leaves", href: "/dashboard/leaves", icon: CalendarIcon, show: true },
  ].filter(item => item.show) : [
    { name: "My Leaves", href: "/dashboard/leaves", icon: CalendarIcon, show: true },
    { name: "Who's Out", href: "/dashboard/leaves/whos-out", icon: UsersIcon, show: canViewWhosOut },
  ].filter(item => item.show);

  // MANAGE - Less frequent tasks (HR only)
  const manageNavigation = [
    { name: "Assets", href: "/dashboard/assets", icon: PackageIcon, show: isHROrAbove },
    { name: "Notices", href: "/dashboard/notices", icon: MegaphoneIcon, show: isHROrAbove },
    { name: "Org Chart", href: "/dashboard/org-chart", icon: OrgChartIcon, show: true },
  ].filter(item => item.show);

  // SETTINGS - Admin/HR settings
  const settingsNavigation = [
    { name: "Organization", href: "/dashboard/settings/organization", icon: BuildingIcon, show: user?.role === "ADMIN" },
    { name: "Permissions", href: "/dashboard/settings/permissions", icon: ShieldIcon, show: user?.role === "ADMIN" },
    { name: "Leave Types", href: "/dashboard/settings/leave-types", icon: SettingsIcon, show: hasRoleAccess("leaveTypes") },
    { name: "Leave Policy", href: "/dashboard/settings/leave-policy", icon: CalendarIcon, show: hasRoleAccess("leaveTypes") },
    { name: "Import Data", href: "/dashboard/import", icon: UploadIcon, show: isHROrAbove },
    { name: "Audit Logs", href: "/dashboard/settings/audit-logs", icon: LogIcon, show: hasRoleAccess("auditLogs") },
  ].filter(item => item.show);

  return (
    <ToastProvider>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 transform bg-white border-r border-gray-200 transition-all duration-200 dark:bg-gray-900 dark:border-gray-800 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-16 overflow-visible" : "lg:w-60"} w-60`}
      >
        <div className={`flex h-12 items-center border-b border-gray-200 dark:border-gray-800 ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}>
          <Link href="/dashboard" className={`flex items-center min-w-0 ${collapsed ? "justify-center" : "gap-2.5"}`}>
            {orgSettings?.logoUrl ? (
              <img
                src={orgSettings.logoUrl}
                alt={orgSettings.name || "Logo"}
                className="h-7 w-7 rounded object-contain flex-shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={`flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 flex-shrink-0 ${orgSettings?.logoUrl ? "hidden" : ""}`}>
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate block">
                  {orgSettings?.name || "HRM"}
                </span>
              </div>
            )}
          </Link>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`flex flex-col h-[calc(100vh-3rem)] scrollbar-hide ${collapsed ? "overflow-visible" : "overflow-y-auto"}`}>
          <nav className={`flex-1 py-3 space-y-4 ${collapsed ? "px-2" : "px-2"}`}>
            {/* MAIN - Core daily work */}
            <div>
              {!collapsed && <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Main</p>}
              <div className="space-y-0.5">
                {mainNavigation.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                        isActive
                          ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                      }`}
                    >
                      <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                      {!collapsed && <span className="text-[13px]">{item.name}</span>}
                      {collapsed && (
                        <span className="sidebar-tooltip">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* ORGANIZATION - Structure (HR only) */}
            {orgNavigation.length > 0 && (
              <div>
                {!collapsed && <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Organization</p>}
                {collapsed && <div className="border-t border-gray-200 dark:border-gray-700 my-2" />}
                <div className="space-y-0.5">
                  {orgNavigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                          isActive
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                        {!collapsed && <span className="text-[13px]">{item.name}</span>}
                        {collapsed && (
                          <span className="sidebar-tooltip">
                            {item.name}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LEAVE */}
            <div>
              {!collapsed && <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Leave</p>}
              {collapsed && <div className="border-t border-gray-200 dark:border-gray-700 my-2" />}
              <div className="space-y-0.5">
                {leaveNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                        isActive
                          ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                      }`}
                    >
                      <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                      {!collapsed && <span className="text-[13px]">{item.name}</span>}
                      {collapsed && (
                        <span className="sidebar-tooltip">
                          {item.name}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* MANAGE - Less frequent (HR only) */}
            {manageNavigation.length > 0 && (
              <div>
                {!collapsed && <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Manage</p>}
                {collapsed && <div className="border-t border-gray-200 dark:border-gray-700 my-2" />}
                <div className="space-y-0.5">
                  {manageNavigation.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                          isActive
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                        {!collapsed && <span className="text-[13px]">{item.name}</span>}
                        {collapsed && (
                          <span className="sidebar-tooltip">
                            {item.name}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {settingsNavigation.length > 0 && (
              <div>
                {!collapsed && <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Settings</p>}
                {collapsed && <div className="border-t border-gray-200 dark:border-gray-700 my-2" />}
                <div className="space-y-0.5">
                  {settingsNavigation.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                          isActive
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                        {!collapsed && <span className="text-[13px]">{item.name}</span>}
                        {collapsed && (
                          <span className="sidebar-tooltip">
                            {item.name}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

          <div className={`border-t border-gray-200 dark:border-gray-800 ${collapsed ? "p-2" : "p-3"}`}>
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="nav-item flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300 cursor-default">
                  {user.firstName[0]}{user.lastName[0]}
                  <span className="sidebar-tooltip">{user.firstName} {user.lastName}</span>
                </div>
                <button
                  onClick={() => setCollapsed(false)}
                  className="nav-item flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <SidebarExpandIcon className="h-[18px] w-[18px]" />
                  <span className="sidebar-tooltip">Expand</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300 flex-shrink-0">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                      {user.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCollapsed(true)}
                  className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <SidebarCollapseIcon className="h-[18px] w-[18px]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className={`transition-all duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}>
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 lg:px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
    </ToastProvider>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function ContactIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function OrgChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  );
}

function LogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function SidebarCollapseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
    </svg>
  );
}

function SidebarExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
    </svg>
  );
}
