"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@/components";
import type { Role, Gender, MaritalStatus, EmploymentType, LeaveType } from "@/types";

const ALLOWED_ROLES = ["ADMIN", "HR"];

interface UserData {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profilePicture?: string;
  linkedIn?: string;
  twitter?: string;
  github?: string;
  website?: string;
  role: Role;
  status: string;
  dateOfBirth?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  employmentType: EmploymentType;
  joiningDate?: string;
  designation?: string;
  branch?: { id: string; name: string };
  department?: { id: string; name: string };
  team?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string };
}

interface CurrentUser {
  id: string;
  role: string;
}

interface Allocation {
  id: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  year: number;
  allocated: number;
  used: number;
  carriedOver: number;
  adjusted: number;
  balance: number;
  notes?: string;
}

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: string;
  condition: string;
  assignedAt?: string;
}

type TabType = "overview" | "employment" | "leaves" | "assets";

export default function ViewUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [user, setUser] = useState<UserData | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then(r => r.json()),
      fetch(`/api/users/${id}`).then(r => r.json()),
      fetch(`/api/leave-allocations?userId=${id}&year=${selectedYear}`).then(r => r.json()),
      fetch(`/api/assets?userId=${id}`).then(r => r.json()),
    ]).then(([meData, userData, allocData, assetsData]) => {
      if (meData.success) {
        setCurrentUser(meData.data.user);
        if (!ALLOWED_ROLES.includes(meData.data.user.role)) {
          router.replace("/dashboard");
          return;
        }
      }
      if (userData.success) {
        setUser(userData.data.user);
      }
      if (allocData.success) {
        setAllocations(allocData.data.allocations);
      }
      if (assetsData.assets) {
        setAssets(assetsData.assets);
      }
      setLoading(false);
    });
  }, [id, router, selectedYear]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  const tabs = [
    { id: "overview" as TabType, label: "Overview" },
    { id: "employment" as TabType, label: "Employment" },
    { id: "leaves" as TabType, label: "Leaves" },
    { id: "assets" as TabType, label: "Assets" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  if (!user || !currentUser || !ALLOWED_ROLES.includes(currentUser.role)) {
    return <div className="p-8 text-center text-gray-500">User not found</div>;
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-gray-100 text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.firstName}
                className="h-16 w-16 rounded-md object-cover"
              />
            ) : (
              `${user.firstName[0]}${user.lastName[0]}`
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {user.designation || user.role} • {user.employeeId}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                user.status === "ACTIVE"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : user.status === "INACTIVE"
                  ? "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }`}>
                {user.status.charAt(0) + user.status.slice(1).toLowerCase()}
              </span>
              <span className="inline-flex rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {user.role.replace("_", " ").split(" ").map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>Back</Button>
          <Link href={`/dashboard/users/${id}`}>
            <Button>Edit User</Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
              {tab.id === "assets" && assets.length > 0 && (
                <span className="ml-1.5 text-xs text-gray-400">({assets.length})</span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Contact & Personal Info */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Contact Information</h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{user.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{user.phone || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Address</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[200px]">
                    {[user.address, user.city, user.state, user.country, user.postalCode].filter(Boolean).join(", ") || "-"}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Personal Information</h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(user.dateOfBirth)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Gender</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{user.gender || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Marital Status</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{user.maritalStatus || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Nationality</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">{user.nationality || "-"}</dd>
                </div>
              </dl>
            </Card>
          </div>

          {/* Emergency Contact */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Emergency Contact</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Contact Name</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.emergencyContact || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Contact Phone</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.emergencyContactPhone || "-"}</dd>
              </div>
            </dl>
          </Card>

          {/* Social Links */}
          {(user.linkedIn || user.twitter || user.github || user.website) && (
            <Card>
              <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Social Links</h2>
              <div className="flex flex-wrap gap-2">
                {user.linkedIn && (
                  <a href={user.linkedIn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                )}
                {user.twitter && (
                  <a href={user.twitter} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                    Twitter
                  </a>
                )}
                {user.github && (
                  <a href={user.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                    GitHub
                  </a>
                )}
                {user.website && (
                  <a href={user.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg>
                    Website
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "employment" && (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Employment Details</h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Employee ID</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.employeeId}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Designation</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.designation || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Employment Type</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.employmentType?.replace("_", " ") || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Joining Date</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatDate(user.joiningDate)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Role</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.role.replace("_", " ")}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Status</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.status}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Organization</h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Branch</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.branch?.name || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Department</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.department?.name || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Team</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{user.team?.name || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Reporting Manager</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : "-"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      )}

      {activeTab === "leaves" && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Leave Allocations</h2>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {allocations.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No leave allocations for this year.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {allocations.map((alloc) => {
                  const total = alloc.allocated + alloc.adjusted;
                  const usedPercent = total > 0 ? (alloc.used / total) * 100 : 0;
                  return (
                    <div key={alloc.id} className="rounded border border-gray-200 p-4 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: alloc.leaveType?.color || "#3B82F6" }} />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{alloc.leaveType?.name}</span>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between">
                        <span className={`text-2xl font-bold ${alloc.balance > 0 ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                          {alloc.balance}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">/ {total} days</span>
                      </div>
                      <div className="mt-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${usedPercent}%`, backgroundColor: alloc.leaveType?.color || "#3B82F6" }}
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Used: {alloc.used} days</p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "assets" && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Assigned Assets</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">{assets.length} asset{assets.length !== 1 ? "s" : ""}</span>
            </div>

            {assets.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No assets currently assigned.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {assets.map((asset) => (
                  <Link
                    key={asset.id}
                    href={`/dashboard/assets/${asset.id}`}
                    className="flex items-start gap-3 rounded border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
                  >
                    <div className="rounded bg-gray-100 p-2 dark:bg-gray-700">
                      <svg className="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{asset.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{asset.assetTag}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{asset.category.replace(/_/g, " ")}</span>
                        <span className={`inline-flex rounded px-1 py-0.5 text-[10px] font-medium ${
                          asset.condition === "NEW" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          asset.condition === "EXCELLENT" ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" :
                          asset.condition === "GOOD" ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400" :
                          asset.condition === "FAIR" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {asset.condition.charAt(0) + asset.condition.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
