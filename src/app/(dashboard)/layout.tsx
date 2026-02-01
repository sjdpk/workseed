"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
    onlineAttendance?: {
      enabled?: boolean;
      scope?: "all" | "department" | "team" | "specific";
      departmentIds?: string[];
      teamIds?: string[];
      userIds?: string[];
    };
  };
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Refetch notifications when sidebar opens
  const openNotifications = () => {
    fetchNotifications();
    setShowNotifications(true);
  };
  const [notificationData, setNotificationData] = useState<{
    pendingLeaves: { id: string; user: string; type: string; days: number }[];
    upcomingBirthdays: { id: string; name: string; department: string; daysUntil: number }[];
    upcomingAnniversaries: { id: string; name: string; department: string; years: number; daysUntil: number }[];
    recentHires: { id: string; name: string; department: string; joiningDate: string | null }[];
  }>({
    pendingLeaves: [],
    upcomingBirthdays: [],
    upcomingAnniversaries: [],
    recentHires: [],
  });

  // Calculate actual count from notification data
  const notificationCount =
    notificationData.pendingLeaves.length +
    notificationData.upcomingBirthdays.length +
    notificationData.upcomingAnniversaries.length;

  // Fetch notifications data
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();

      if (data.success) {
        setNotificationData({
          pendingLeaves: (data.data.recentLeaves || [])
            .filter((l: { status: string }) => l.status === "PENDING")
            .map((l: { id: string; user: string; type: string; days: number }) => ({
              id: l.id,
              user: l.user,
              type: l.type,
              days: l.days,
            })),
          upcomingBirthdays: data.data.upcomingBirthdays || [],
          upcomingAnniversaries: data.data.upcomingAnniversaries || [],
          recentHires: data.data.recentHires || [],
        });
      }
    } catch {
      // Silently fail
    }
  };

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
          // Set page title to org name
          if (orgData.data.settings.name) {
            document.title = orgData.data.settings.name;
          }
          // Set favicon to org logo (circular)
          if (orgData.data.settings.logoUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const size = 64;
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(img, 0, 0, size, size);
                const link =
                  (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ||
                  document.createElement("link");
                link.rel = "icon";
                link.href = canvas.toDataURL("image/png");
                document.head.appendChild(link);
              }
            };
            img.onerror = () => {
              const link =
                (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ||
                document.createElement("link");
              link.rel = "icon";
              link.href = orgData.data.settings.logoUrl;
              document.head.appendChild(link);
            };
            img.src = orgData.data.settings.logoUrl;
          }

          // Apply organization theme
          if (orgData.data.settings.theme?.accentColor) {
            document.documentElement.setAttribute(
              "data-accent",
              orgData.data.settings.theme.accentColor
            );
          }
        }
      })
      .catch(() => router.push("/login"));
  }, [router]);

  // Fetch notifications on mount, on route change, and periodically
  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Refresh every 60 seconds
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user, pathname]);

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
    const allowedRoles =
      roleAccess?.[feature as keyof typeof roleAccess] ?? defaults[feature] ?? [];
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

  // Check if online attendance is enabled for current user
  const hasOnlineAttendance = () => {
    const attendance = orgSettings?.permissions?.onlineAttendance;
    if (!attendance?.enabled) return false;
    if (attendance.scope === "all") return true;
    if (attendance.scope === "department" && user?.departmentId) {
      return attendance.departmentIds?.includes(user.departmentId) || false;
    }
    if (attendance.scope === "team" && user?.teamId) {
      return attendance.teamIds?.includes(user.teamId) || false;
    }
    if (attendance.scope === "specific" && user?.id) {
      return attendance.userIds?.includes(user.id) || false;
    }
    return false;
  };

  // Check if employee can view team/department leaves
  const canViewTeamLeaves =
    orgSettings?.permissions?.employeesCanViewTeamLeaves === true && user?.teamId;
  const canViewDeptLeaves =
    orgSettings?.permissions?.employeesCanViewDepartmentLeaves === true && user?.departmentId;
  const canViewWhosOut = canViewTeamLeaves || canViewDeptLeaves;

  // Tooltip positioning helper
  const handleTooltipPosition = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const tooltip = target.querySelector(".sidebar-tooltip") as HTMLElement;
    if (tooltip) {
      const rect = target.getBoundingClientRect();
      tooltip.style.top = `${rect.top + rect.height / 2}px`;
      tooltip.style.transform = "translateY(-50%)";
    }
  };

  // MAIN - Core daily work (different for HR vs Employee)
  const mainNavigation = isHROrAbove
    ? [
        { name: "Dashboard", href: "/dashboard", icon: HomeIcon, show: true },
        { name: "Users", href: "/dashboard/users", icon: UsersIcon, show: hasRoleAccess("users") },
        { name: "Attendance", href: "/dashboard/attendance/manage", icon: ClockIcon, show: true },
        {
          name: "Leave Requests",
          href: "/dashboard/leaves/requests",
          icon: CalendarIcon,
          show: hasRoleAccess("leaveRequests"),
        },
        { name: "Requests", href: "/dashboard/requests", icon: InboxIcon, show: true },
      ].filter((item) => item.show)
    : [
        { name: "Dashboard", href: "/dashboard", icon: HomeIcon, show: true },
        { name: "My Profile", href: "/dashboard/profile", icon: UserIcon, show: true },
        {
          name: "Attendance",
          href: "/dashboard/attendance",
          icon: ClockIcon,
          show: hasOnlineAttendance(),
        },
      ].filter((item) => item.show);

  // SELF SERVICE - Employee self-service (Employee only)
  const selfServiceNavigation = isHROrAbove
    ? []
    : [
        { name: "Requests", href: "/dashboard/requests", icon: InboxIcon, show: true },
        { name: "Directory", href: "/dashboard/directory", icon: ContactIcon, show: true },
      ].filter((item) => item.show);

  // COMPANY - Company info (Employee only)
  const companyNavigation = isHROrAbove
    ? []
    : [
        {
          name: "Announcements",
          href: "/dashboard/announcements",
          icon: MegaphoneIcon,
          show: true,
        },
        {
          name: "Holidays",
          href: "/dashboard/settings/holidays",
          icon: CalendarCheckIcon,
          show: true,
        },
        { name: "Mobile App", href: "/dashboard/mobile-app", icon: MobileIcon, show: true },
      ].filter((item) => item.show);

  // ORGANIZATION - Structure management (HR only)
  const orgNavigation = [
    {
      name: "Departments",
      href: "/dashboard/departments",
      icon: BuildingIcon,
      show: hasRoleAccess("departments"),
    },
    { name: "Teams", href: "/dashboard/teams", icon: TeamIcon, show: hasRoleAccess("teams") },
    {
      name: "Branches",
      href: "/dashboard/branches",
      icon: LocationIcon,
      show: hasRoleAccess("branches"),
    },
  ].filter((item) => item.show);

  // LEAVE - Leave management
  const leaveNavigation = isHROrAbove
    ? [{ name: "My Leaves", href: "/dashboard/leaves", icon: CalendarIcon, show: true }].filter(
        (item) => item.show
      )
    : [
        { name: "My Leaves", href: "/dashboard/leaves", icon: CalendarIcon, show: true },
        {
          name: "Who's Out",
          href: "/dashboard/leaves/whos-out",
          icon: UsersIcon,
          show: canViewWhosOut,
        },
      ].filter((item) => item.show);

  // MANAGE - Less frequent tasks (HR only)
  const manageNavigation = [
    {
      name: "Reports",
      href: "/dashboard/reports",
      icon: ChartIcon,
      show: hasRoleAccess("reports"),
    },
    { name: "Assets", href: "/dashboard/assets", icon: PackageIcon, show: isHROrAbove },
    { name: "Notices", href: "/dashboard/notices", icon: MegaphoneIcon, show: isHROrAbove },
    { name: "Org Chart", href: "/dashboard/org-chart", icon: OrgChartIcon, show: true },
  ].filter((item) => item.show);

  // NOTIFICATIONS - Email notifications (HR only)
  const notificationsNavigation = [
    { name: "Overview", href: "/dashboard/notifications", icon: EmailIcon, show: isHROrAbove },
    { name: "Templates", href: "/dashboard/notifications/templates", icon: FileIcon, show: isHROrAbove },
    { name: "Rules", href: "/dashboard/notifications/rules", icon: SettingsIcon, show: isHROrAbove },
    { name: "Logs", href: "/dashboard/notifications/logs", icon: LogIcon, show: isHROrAbove },
  ].filter((item) => item.show);

  // SETTINGS - Admin/HR settings
  const settingsNavigation = [
    {
      name: "Organization",
      href: "/dashboard/settings/organization",
      icon: BuildingIcon,
      show: user?.role === "ADMIN",
    },
    {
      name: "Permissions",
      href: "/dashboard/settings/permissions",
      icon: ShieldIcon,
      show: user?.role === "ADMIN",
    },
    {
      name: "Holidays",
      href: "/dashboard/settings/holidays",
      icon: CalendarCheckIcon,
      show: isHROrAbove,
    },
    {
      name: "Mobile Setup",
      href: "/dashboard/settings/mobile-setup",
      icon: QRCodeIcon,
      show: isHROrAbove,
    },
    {
      name: "Leave Types",
      href: "/dashboard/settings/leave-types",
      icon: SettingsIcon,
      show: hasRoleAccess("leaveTypes"),
    },
    {
      name: "Leave Policy",
      href: "/dashboard/settings/leave-policy",
      icon: CalendarIcon,
      show: hasRoleAccess("leaveTypes"),
    },
        { name: "Import Data", href: "/dashboard/import", icon: UploadIcon, show: isHROrAbove },
    {
      name: "Audit Logs",
      href: "/dashboard/settings/audit-logs",
      icon: LogIcon,
      show: hasRoleAccess("auditLogs"),
    },
  ].filter((item) => item.show);

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
          } ${collapsed ? "lg:w-16" : "lg:w-60"} w-60`}
        >
          <div
            className={`flex h-12 items-center border-b border-gray-200 dark:border-gray-800 ${collapsed ? "justify-center px-2" : "justify-between px-3"}`}
          >
            <Link
              href="/dashboard"
              className={`flex items-center min-w-0 ${collapsed ? "justify-center" : "gap-2.5"}`}
            >
              {orgSettings?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Dynamic URL from org settings
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
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 flex-shrink-0 ${orgSettings?.logoUrl ? "hidden" : ""}`}
              >
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                  />
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
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex flex-col h-[calc(100vh-3rem)]">
            <nav
              className={`flex-1 py-3 space-y-4 overflow-y-auto scrollbar-hide ${collapsed ? "px-2" : "px-2"}`}
            >
              {/* MAIN - Core daily work */}
              <div>
                {!collapsed && (
                  <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Main
                  </p>
                )}
                <div className="space-y-0.5">
                  {mainNavigation.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onMouseEnter={collapsed ? handleTooltipPosition : undefined}
                        className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                          isActive
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                        {!collapsed && <span className="text-[13px]">{item.name}</span>}
                        {collapsed && <span className="sidebar-tooltip">{item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* ORGANIZATION - Structure (HR only) */}
              {orgNavigation.length > 0 && (
                <div>
                  {!collapsed && (
                    <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      Organization
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {orgNavigation.map((item) => {
                      const isActive =
                        pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onMouseEnter={collapsed ? handleTooltipPosition : undefined}
                          className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                            isActive
                              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          }`}
                        >
                          <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                          {!collapsed && <span className="text-[13px]">{item.name}</span>}
                          {collapsed && <span className="sidebar-tooltip">{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SELF SERVICE - Employee only */}
              {selfServiceNavigation.length > 0 && (
                <div>
                  {!collapsed && (
                    <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      Self Service
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {selfServiceNavigation.map((item) => {
                      const isActive =
                        pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onMouseEnter={collapsed ? handleTooltipPosition : undefined}
                          className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                            isActive
                              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          }`}
                        >
                          <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                          {!collapsed && <span className="text-[13px]">{item.name}</span>}
                          {collapsed && <span className="sidebar-tooltip">{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LEAVE */}
              <div>
                {!collapsed && (
                  <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                    Leave
                  </p>
                )}
                <div className="space-y-0.5">
                  {leaveNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onMouseEnter={collapsed ? handleTooltipPosition : undefined}
                        className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                          isActive
                            ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        }`}
                      >
                        <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                        {!collapsed && <span className="text-[13px]">{item.name}</span>}
                        {collapsed && <span className="sidebar-tooltip">{item.name}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* COMPANY - Employee only */}
              {companyNavigation.length > 0 && (
                <div>
                  {!collapsed && (
                    <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      Company
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {companyNavigation.map((item) => {
                      const isActive =
                        pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onMouseEnter={collapsed ? handleTooltipPosition : undefined}
                          className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                            isActive
                              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          }`}
                        >
                          <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                          {!collapsed && <span className="text-[13px]">{item.name}</span>}
                          {collapsed && <span className="sidebar-tooltip">{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MANAGE - Less frequent (HR only) */}
              {manageNavigation.length > 0 && (
                <div>
                  {!collapsed && (
                    <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      Manage
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {manageNavigation.map((item) => {
                      const isActive =
                        pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onMouseEnter={collapsed ? handleTooltipPosition : undefined}
                          className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                            isActive
                              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          }`}
                        >
                          <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                          {!collapsed && <span className="text-[13px]">{item.name}</span>}
                          {collapsed && <span className="sidebar-tooltip">{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS */}
              {notificationsNavigation.length > 0 && (
                <div>
                  {!collapsed && (
                    <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      Notifications
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {notificationsNavigation.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onMouseEnter={collapsed ? handleTooltipPosition : undefined}
                          className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                            isActive
                              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          }`}
                        >
                          <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                          {!collapsed && <span className="text-[13px]">{item.name}</span>}
                          {collapsed && <span className="sidebar-tooltip">{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SETTINGS */}
              {settingsNavigation.length > 0 && (
                <div>
                  {!collapsed && (
                    <p className="px-3 text-[10px] font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                      Settings
                    </p>
                  )}
                  <div className="space-y-0.5">
                    {settingsNavigation.map((item) => {
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onMouseEnter={collapsed ? handleTooltipPosition : undefined}
                          className={`nav-item flex items-center rounded-md transition-colors ${collapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${
                            isActive
                              ? "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          }`}
                        >
                          <item.icon className="h-[18px] w-[18px] flex-shrink-0" />
                          {!collapsed && <span className="text-[13px]">{item.name}</span>}
                          {collapsed && <span className="sidebar-tooltip">{item.name}</span>}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </nav>

            <div className={`${collapsed ? "p-2" : "p-3"}`}>
              {collapsed ? (
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="nav-item flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300 cursor-default"
                    onMouseEnter={handleTooltipPosition}
                  >
                    {user.firstName[0]}
                    {user.lastName[0]}
                    <span className="sidebar-tooltip">
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                  <button
                    onClick={() => setCollapsed(false)}
                    onMouseEnter={handleTooltipPosition}
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
                      {user.firstName[0]}
                      {user.lastName[0]}
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
              <svg
                className="h-5 w-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="flex items-center gap-3 ml-auto">
              <button
                onClick={openNotifications}
                className="relative flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              >
                <BellIcon className="h-5 w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </header>

          <main className="p-4 lg:p-6">{children}</main>
        </div>

        {/* Notifications Sidebar */}
        {showNotifications && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div
              className="absolute inset-0 bg-black/20"
              onClick={() => setShowNotifications(false)}
            />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-gray-900">
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <BellIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h2>
                    {notificationCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-medium text-white">
                        {notificationCount}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* Pending Leave Requests */}
                  {notificationData.pendingLeaves.length > 0 && (
                    <div className="border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50">
                        <ClockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Pending Leaves</span>
                        <span className="text-xs text-gray-400">({notificationData.pendingLeaves.length})</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {notificationData.pendingLeaves.map((leave) => (
                          <Link
                            key={leave.id}
                            href="/dashboard/leaves/requests"
                            onClick={() => setShowNotifications(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                              {leave.user.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{leave.user}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{leave.type} · {leave.days}d</p>
                            </div>
                            <ChevronRightIcon className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upcoming Birthdays */}
                  {notificationData.upcomingBirthdays.length > 0 && (
                    <div className="border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50">
                        <CakeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Birthdays</span>
                        <span className="text-xs text-gray-400">({notificationData.upcomingBirthdays.length})</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {notificationData.upcomingBirthdays.map((b) => (
                          <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                              {b.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{b.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{b.department}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              b.daysUntil === 0
                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                : "text-gray-500 dark:text-gray-400"
                            }`}>
                              {b.daysUntil === 0 ? "Today" : b.daysUntil === 1 ? "Tomorrow" : `${b.daysUntil}d`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Work Anniversaries */}
                  {notificationData.upcomingAnniversaries.length > 0 && (
                    <div className="border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50">
                        <TrophyIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Anniversaries</span>
                        <span className="text-xs text-gray-400">({notificationData.upcomingAnniversaries.length})</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {notificationData.upcomingAnniversaries.map((a) => (
                          <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                              {a.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{a.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{a.years}yr · {a.department}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              a.daysUntil === 0
                                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                                : "text-gray-500 dark:text-gray-400"
                            }`}>
                              {a.daysUntil === 0 ? "Today" : a.daysUntil === 1 ? "Tomorrow" : `${a.daysUntil}d`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Hires */}
                  {notificationData.recentHires.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50">
                        <UserPlusIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">New Hires</span>
                        <span className="text-xs text-gray-400">({notificationData.recentHires.length})</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {notificationData.recentHires.slice(0, 5).map((h) => (
                          <Link
                            key={h.id}
                            href={`/dashboard/users/${h.id}/view`}
                            onClick={() => setShowNotifications(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-300">
                              {h.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{h.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{h.department || "No department"}</p>
                            </div>
                            {h.joiningDate && (
                              <span className="text-xs text-gray-400">
                                {new Date(h.joiningDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {notificationCount === 0 && notificationData.recentHires.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                        <BellIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">All caught up!</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
      />
    </svg>
  );
}

function LocationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function TeamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function ContactIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function OrgChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
      />
    </svg>
  );
}

function LogIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function SidebarCollapseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12"
      />
    </svg>
  );
}

function SidebarExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
      />
    </svg>
  );
}

function QRCodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"
      />
    </svg>
  );
}

function MobileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
      />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v6.75m-17.5 0v4.5a2.25 2.25 0 002.25 2.25h13a2.25 2.25 0 002.25-2.25v-4.5"
      />
    </svg>
  );
}

function CalendarCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
      />
    </svg>
  );
}

function EmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
      />
    </svg>
  );
}

function CakeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m18-6.121v3.246c0 1.135-.845 2.098-1.976 2.192a48.424 48.424 0 01-8.024.166 48.42 48.42 0 01-4.024-.166C5.845 15.719 5 14.756 5 13.621v-3.246m16 0c0 1.135-.845 2.098-1.976 2.192a48.424 48.424 0 01-8.024.166 48.42 48.42 0 01-4.024-.166C5.845 12.719 5 11.756 5 10.621"
      />
    </svg>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m3.044-1.35a6.726 6.726 0 01-2.749 1.35m0 0v1.122c0 .621-.504 1.125-1.125 1.125H12m-.773-2.247L12 10.5m0 0l.773-.252M12 10.5v2.25m7.27-2.772a6.003 6.003 0 00-1.904-5.712m1.904 5.712a6.726 6.726 0 01-2.749 1.35m2.749-1.35v.249m0 0c.982.143 1.954.317 2.916.52M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228"
      />
    </svg>
  );
}

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
