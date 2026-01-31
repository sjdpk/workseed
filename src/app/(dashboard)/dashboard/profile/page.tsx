"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, useToast } from "@/components";

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

interface LeaveAllocation {
  id: string;
  leaveType: {
    name: string;
    color?: string;
  };
  allocated: number;
  used: number;
  adjusted: number;
  balance: number;
}

interface UserProfile {
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
  role: string;
  status: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  employmentType?: string;
  joiningDate?: string;
  designation?: string;
  department?: { name: string };
  team?: { name: string };
  branch?: { name: string };
  manager?: { firstName: string; lastName: string };
}

interface OrgSettings {
  permissions?: {
    showOwnAssetsToEmployee?: boolean;
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  LAPTOP: "💻",
  DESKTOP: "🖥️",
  MOBILE: "📱",
  TABLET: "📱",
  MONITOR: "🖥️",
  KEYBOARD: "⌨️",
  MOUSE: "🖱️",
  HEADSET: "🎧",
  FURNITURE: "🪑",
  VEHICLE: "🚗",
  ID_CARD: "🪪",
  ACCESS_CARD: "💳",
  SOFTWARE_LICENSE: "📄",
  OTHER: "📦",
};

const CONDITION_COLORS: Record<string, string> = {
  NEW: "text-green-600 dark:text-green-400",
  EXCELLENT: "text-gray-600 dark:text-gray-400",
  GOOD: "text-cyan-600 dark:text-cyan-400",
  FAIR: "text-yellow-600 dark:text-yellow-400",
  POOR: "text-red-600 dark:text-red-400",
};

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    phone: "",
    profilePicture: "",
    linkedIn: "",
    twitter: "",
    github: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    emergencyContact: "",
    emergencyContactPhone: "",
    password: "",
  });
  const [showLeaveSidebar, setShowLeaveSidebar] = useState(false);

  const currentYear = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
    ]).then(async ([meData, orgData]) => {
      if (!meData.success) {
        router.push("/login");
        return;
      }

      const userData = meData.data.user;
      setUser(userData);
      setFormData({
        phone: userData.phone || "",
        profilePicture: userData.profilePicture || "",
        linkedIn: userData.linkedIn || "",
        twitter: userData.twitter || "",
        github: userData.github || "",
        website: userData.website || "",
        address: userData.address || "",
        city: userData.city || "",
        state: userData.state || "",
        country: userData.country || "",
        postalCode: userData.postalCode || "",
        emergencyContact: userData.emergencyContact || "",
        emergencyContactPhone: userData.emergencyContactPhone || "",
        password: "",
      });

      if (orgData.success) {
        setOrgSettings(orgData.data.settings);
      }

      // Fetch assets and leave allocations
      const [assetsRes, allocRes] = await Promise.all([
        fetch("/api/assets").then((r) => r.json()),
        fetch(`/api/leave-allocations?userId=${userData.id}&year=${currentYear}`).then((r) => r.json()),
      ]);

      if (assetsRes.assets) {
        setAssets(assetsRes.assets);
      }
      if (allocRes.success) {
        setAllocations(allocRes.data.allocations);
      }

      setLoading(false);
    });
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        phone: formData.phone || null,
        profilePicture: formData.profilePicture || null,
        linkedIn: formData.linkedIn || null,
        twitter: formData.twitter || null,
        github: formData.github || null,
        website: formData.website || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        postalCode: formData.postalCode || null,
        emergencyContact: formData.emergencyContact || null,
        emergencyContactPhone: formData.emergencyContactPhone || null,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to update profile");
        return;
      }

      setUser((prev) => (prev ? { ...prev, ...payload, password: undefined } : null));
      setEditMode(false);
      setFormData((prev) => ({ ...prev, password: "" }));
      toast.success("Profile updated successfully");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  // Show assets by default (true) unless explicitly disabled (false)
  const showAssets = orgSettings?.permissions?.showOwnAssetsToEmployee ?? true;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Profile</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage your personal information
          </p>
        </div>
        {!editMode && (
          <Button onClick={() => setEditMode(true)}>Edit Profile</Button>
        )}
      </div>

      {/* Profile Header */}
      <Card>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-2xl font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.firstName}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              `${user.firstName[0]}${user.lastName[0]}`
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {user.designation || user.role} • {user.employeeId}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              {user.department && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {user.department.name}
                </span>
              )}
              {user.team && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {user.team.name}
                </span>
              )}
              {user.branch && (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {user.branch.name}
                </span>
              )}
            </div>
            {user.manager && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Reports to: {user.manager.firstName} {user.manager.lastName}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Leave Balance Compact */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Leave Balance
            </h2>
            {allocations.length > 0 && (
              <div className="flex items-center gap-3">
                {allocations.slice(0, 3).map((alloc) => (
                  <div key={alloc.id} className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: alloc.leaveType.color || "#3B82F6" }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {alloc.leaveType.name.split(" ")[0]}:
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {alloc.balance}
                    </span>
                  </div>
                ))}
                {allocations.length > 3 && (
                  <span className="text-sm text-gray-400">+{allocations.length - 3} more</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowLeaveSidebar(true)}>
              View All
            </Button>
            <Link href="/dashboard/leaves/apply">
              <Button size="sm">Apply Leave</Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Leave Balance Sidebar */}
      {showLeaveSidebar && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowLeaveSidebar(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-gray-900">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Leave Balance ({currentYear})
                </h2>
                <button
                  onClick={() => setShowLeaveSidebar(false)}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {allocations.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No leave allocations found for this year.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {allocations.map((alloc) => {
                      const total = alloc.allocated + alloc.adjusted;
                      const usedPercent = total > 0 ? (alloc.used / total) * 100 : 0;
                      return (
                        <div
                          key={alloc.id}
                          className="rounded border border-gray-200 p-4 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: alloc.leaveType.color || "#3B82F6" }}
                              />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {alloc.leaveType.name}
                              </span>
                            </div>
                            <span className={`text-lg font-bold ${alloc.balance > 0 ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
                              {alloc.balance}
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${usedPercent}%`,
                                  backgroundColor: alloc.leaveType.color || "#3B82F6",
                                }}
                              />
                            </div>
                          </div>
                          <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>Used: {alloc.used} days</span>
                            <span>Total: {total} days</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <Link href="/dashboard/leaves/apply" className="block">
                  <Button className="w-full">Apply for Leave</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Assets */}
      {showAssets && (
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            My Assigned Assets
          </h2>
          {assets.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No assets currently assigned to you.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="rounded border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{CATEGORY_ICONS[asset.category] || "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {asset.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {asset.assetTag}
                      </p>
                      {(asset.brand || asset.model) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {asset.brand} {asset.model}
                        </p>
                      )}
                      {asset.serialNumber && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          S/N: {asset.serialNumber}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`text-xs font-medium ${
                            CONDITION_COLORS[asset.condition] || ""
                          }`}
                        >
                          {asset.condition}
                        </span>
                        {asset.assignedAt && (
                          <span className="text-xs text-gray-400">
                            Since {formatDate(asset.assignedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Edit Form or Details View */}
      {editMode ? (
        <form onSubmit={handleUpdate} className="space-y-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Contact Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="phone"
                label="Phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <Input
                id="password"
                type="password"
                label="New Password (leave empty to keep current)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Profile & Social Links
            </h2>
            <div className="mb-4">
              <Input
                id="profilePicture"
                label="Profile Picture URL"
                value={formData.profilePicture}
                onChange={(e) => setFormData({ ...formData, profilePicture: e.target.value })}
                placeholder="https://example.com/photo.jpg"
              />
              {formData.profilePicture && (
                <div className="mt-2">
                  <img
                    src={formData.profilePicture}
                    alt="Profile preview"
                    className="h-16 w-16 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="linkedIn"
                label="LinkedIn"
                value={formData.linkedIn}
                onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                placeholder="https://linkedin.com/in/username"
              />
              <Input
                id="twitter"
                label="Twitter / X"
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                placeholder="https://twitter.com/username"
              />
              <Input
                id="github"
                label="GitHub"
                value={formData.github}
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                placeholder="https://github.com/username"
              />
              <Input
                id="website"
                label="Website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  id="address"
                  label="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <Input
                id="city"
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
              <Input
                id="state"
                label="State"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
              <Input
                id="country"
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
              <Input
                id="postalCode"
                label="Postal Code"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Emergency Contact
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="emergencyContact"
                label="Contact Name"
                value={formData.emergencyContact}
                onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              />
              <Input
                id="emergencyContactPhone"
                label="Contact Phone"
                value={formData.emergencyContactPhone}
                onChange={(e) =>
                  setFormData({ ...formData, emergencyContactPhone: e.target.value })
                }
              />
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setEditMode(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      ) : (
        <>
          {/* Personal Information */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Personal Information
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user.phone || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {formatDate(user.dateOfBirth)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Gender</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user.gender || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Nationality</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user.nationality || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Employment Type</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user.employmentType?.replace(/_/g, " ") || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Joining Date</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {formatDate(user.joiningDate)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Address */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Address</h2>
            <p className="text-sm text-gray-900 dark:text-white">
              {[user.address, user.city, user.state, user.country, user.postalCode]
                .filter(Boolean)
                .join(", ") || "Not provided"}
            </p>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Emergency Contact
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user.emergencyContact || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {user.emergencyContactPhone || "-"}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Social Links */}
          {(user.linkedIn || user.twitter || user.github || user.website) && (
            <Card>
              <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
                Social Links
              </h2>
              <div className="flex flex-wrap gap-3">
                {user.linkedIn && (
                  <a
                    href={user.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  >
                    LinkedIn
                  </a>
                )}
                {user.twitter && (
                  <a
                    href={user.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded bg-sky-100 px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-200 dark:bg-sky-900/50 dark:text-sky-400"
                  >
                    Twitter
                  </a>
                )}
                {user.github && (
                  <a
                    href={user.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                  >
                    GitHub
                  </a>
                )}
                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded bg-green-100 px-3 py-1.5 text-sm text-green-700 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-400"
                  >
                    Website
                  </a>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
