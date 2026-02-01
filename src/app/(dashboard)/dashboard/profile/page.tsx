"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

type TabType = "overview" | "leaves" | "assets" | "settings";

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");

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
        fetch(`/api/leave-allocations?userId=${userData.id}&year=${currentYear}`).then((r) =>
          r.json()
        ),
      ]);

      if (assetsRes.assets) {
        setAssets(assetsRes.assets);
      }
      if (allocRes.success) {
        setAllocations(allocRes.data.allocations);
      }

      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const tabs = [
    { id: "overview" as TabType, label: "Overview" },
    { id: "leaves" as TabType, label: "Leaves" },
    ...(showAssets ? [{ id: "assets" as TabType, label: "Assets" }] : []),
    { id: "settings" as TabType, label: "Settings" },
  ];

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-md bg-gray-100 text-lg font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
            {user.profilePicture ? (
              // eslint-disable-next-line @next/next/no-img-element -- Dynamic URL from user profile
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
              {user.team && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {user.team.name}
                </span>
              )}
              {user.branch && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {user.branch.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link href="/dashboard/leaves/apply">
          <Button>Apply Leave</Button>
        </Link>
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
              <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
                Contact Information
              </h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.email}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Phone</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.phone || "-"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Address</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[200px]">
                    {[user.address, user.city, user.state, user.country, user.postalCode]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card>
              <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
                Personal Information
              </h2>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDate(user.dateOfBirth)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Gender</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.gender || "-"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Marital Status</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.maritalStatus || "-"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Nationality</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.nationality || "-"}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          {/* Employment Details */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Employment Details
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Employment Type</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {user.employmentType?.replace("_", " ") || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Joining Date</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(user.joiningDate)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Department</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {user.department?.name || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Reporting Manager</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {user.manager ? `${user.manager.firstName} ${user.manager.lastName}` : "-"}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Emergency Contact
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Contact Name</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {user.emergencyContact || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Contact Phone</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
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
              <div className="flex flex-wrap gap-2">
                {user.linkedIn && (
                  <a
                    href={user.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  >
                    LinkedIn
                  </a>
                )}
                {user.twitter && (
                  <a
                    href={user.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  >
                    Twitter
                  </a>
                )}
                {user.github && (
                  <a
                    href={user.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  >
                    GitHub
                  </a>
                )}
                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                  >
                    Website
                  </a>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "leaves" && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Leave Balance ({currentYear})
              </h2>
              <Link href="/dashboard/leaves">
                <Button variant="outline" size="sm">
                  View History
                </Button>
              </Link>
            </div>

            {allocations.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No leave allocations for this year.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {allocations.map((alloc) => {
                  const total = alloc.allocated + alloc.adjusted;
                  const usedPercent = total > 0 ? (alloc.used / total) * 100 : 0;
                  return (
                    <div
                      key={alloc.id}
                      className="rounded border border-gray-200 p-4 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: alloc.leaveType.color || "#3B82F6" }}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {alloc.leaveType.name}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between">
                        <span
                          className={`text-2xl font-bold ${alloc.balance > 0 ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}
                        >
                          {alloc.balance}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          / {total} days
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${usedPercent}%`,
                              backgroundColor: alloc.leaveType.color || "#3B82F6",
                            }}
                          />
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Used: {alloc.used} days
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "assets" && showAssets && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Assigned Assets
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {assets.length} asset{assets.length !== 1 ? "s" : ""}
              </span>
            </div>

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
                        <p className="text-xs text-gray-500 dark:text-gray-400">{asset.assetTag}</p>
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
                            className={`text-xs font-medium ${CONDITION_COLORS[asset.condition] || ""}`}
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
        </div>
      )}

      {activeTab === "settings" && (
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
                  {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic URL from user profile */}
                  <img
                    src={formData.profilePicture}
                    alt="Profile preview"
                    className="h-16 w-16 rounded-md object-cover border border-gray-200 dark:border-gray-700"
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

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
