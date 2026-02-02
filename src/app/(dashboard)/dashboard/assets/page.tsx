"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, useToast } from "@/components";

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
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    employeeId: string;
    profilePicture?: string;
    department?: { name: string };
  };
  assignedAt?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "LAPTOP", label: "Laptop" },
  { value: "DESKTOP", label: "Desktop" },
  { value: "MOBILE", label: "Mobile" },
  { value: "TABLET", label: "Tablet" },
  { value: "MONITOR", label: "Monitor" },
  { value: "KEYBOARD", label: "Keyboard" },
  { value: "MOUSE", label: "Mouse" },
  { value: "HEADSET", label: "Headset" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "ID_CARD", label: "ID Card" },
  { value: "ACCESS_CARD", label: "Access Card" },
  { value: "SOFTWARE_LICENSE", label: "Software License" },
  { value: "OTHER", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "RETIRED", label: "Retired" },
  { value: "LOST", label: "Lost" },
  { value: "DAMAGED", label: "Damaged" },
];

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ASSIGNED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  MAINTENANCE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  RETIRED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  LOST: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  DAMAGED: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

const CONDITION_COLORS: Record<string, string> = {
  NEW: "text-green-600 dark:text-green-400",
  EXCELLENT: "text-gray-600 dark:text-gray-400",
  GOOD: "text-cyan-600 dark:text-cyan-400",
  FAIR: "text-yellow-600 dark:text-yellow-400",
  POOR: "text-red-600 dark:text-red-400",
};

export default function AssetsPage() {
  const _router = useRouter();
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (category) params.append("category", category);
      if (status) params.append("status", status);

      const res = await fetch(`/api/assets?${params}`);
      const data = await res.json();

      if (data.success && data.data?.assets) {
        setAssets(data.data.assets);
        setPagination(data.data.pagination);
      }
    } catch {
      toast.error("Failed to fetch assets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, category, status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchAssets();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Assets</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage company assets and equipment
          </p>
        </div>
        <Link href="/dashboard/assets/new">
          <Button>Add Asset</Button>
        </Link>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full rounded border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {(search || category || status) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("");
              setStatus("");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </form>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="text-center p-3">
          <p className="text-base font-semibold text-gray-900 dark:text-white">{pagination.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Assets</p>
        </Card>
        <Card className="text-center p-3">
          <p className="text-base font-semibold text-green-600 dark:text-green-400">
            {assets.filter((a) => a.status === "AVAILABLE").length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
        </Card>
        <Card className="text-center p-3">
          <p className="text-base font-semibold text-gray-600 dark:text-gray-400">
            {assets.filter((a) => a.status === "ASSIGNED").length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Assigned</p>
        </Card>
        <Card className="text-center p-3">
          <p className="text-base font-semibold text-yellow-600 dark:text-yellow-400">
            {assets.filter((a) => a.status === "MAINTENANCE").length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Maintenance</p>
        </Card>
      </div>

      {/* Assets Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
          </div>
        ) : assets.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            No assets found. Create your first asset to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Asset
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Condition
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Warranty
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{asset.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {asset.assetTag}
                          {asset.serialNumber && ` • S/N: ${asset.serialNumber}`}
                        </p>
                        {asset.brand && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {asset.brand} {asset.model}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {asset.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          STATUS_COLORS[asset.status] || ""
                        }`}
                      >
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-sm font-medium ${CONDITION_COLORS[asset.condition] || ""}`}
                      >
                        {asset.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {asset.assignedTo ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                            {asset.assignedTo.firstName[0]}
                            {asset.assignedTo.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {asset.assignedTo.firstName} {asset.assignedTo.lastName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {asset.assignedTo.employeeId}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {asset.warrantyExpiry ? (
                        <span
                          className={`text-sm ${
                            new Date(asset.warrantyExpiry) < new Date()
                              ? "text-red-600 dark:text-red-400"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {formatDate(asset.warrantyExpiry)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/assets/${asset.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
