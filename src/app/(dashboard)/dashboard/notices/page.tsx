"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card } from "@/components";

interface Notice {
  id: string;
  title: string;
  content: string;
  type: "GENERAL" | "IMPORTANT" | "URGENT";
  isActive: boolean;
  publishedAt: string;
  expiresAt: string | null;
  createdBy: { firstName: string; lastName: string };
}

interface CurrentUser {
  role: string;
}

const ALLOWED_ROLES = ["ADMIN", "HR"];

export default function NoticesPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [_currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "GENERAL" | "IMPORTANT" | "URGENT">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchNotices = () => {
    fetch("/api/notices")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setNotices(data.data.notices);
      });
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/notices").then((r) => r.json()),
    ]).then(([meData, noticesData]) => {
      if (meData.success) {
        setCurrentUser(meData.data.user);
        if (!ALLOWED_ROLES.includes(meData.data.user.role)) {
          router.replace("/dashboard");
          return;
        }
      }
      if (noticesData.success) setNotices(noticesData.data.notices);
      setLoading(false);
    });
  }, [router]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await fetch(`/api/notices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentStatus }),
    });
    fetchNotices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    await fetch(`/api/notices/${id}`, { method: "DELETE" });
    fetchNotices();
  };

  const typeColors = {
    GENERAL: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    IMPORTANT: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    URGENT: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  // Helper to check if notice is expired
  const isExpired = (notice: Notice) => {
    if (!notice.expiresAt) return false;
    return new Date(notice.expiresAt) < new Date();
  };

  // Filter notices
  const filteredNotices = notices.filter((notice) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        notice.title.toLowerCase().includes(searchLower) ||
        notice.content.toLowerCase().includes(searchLower) ||
        `${notice.createdBy.firstName} ${notice.createdBy.lastName}`.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter === "active" && (!notice.isActive || isExpired(notice))) return false;
    if (statusFilter === "inactive" && notice.isActive) return false;
    if (statusFilter === "expired" && !isExpired(notice)) return false;

    // Type filter
    if (typeFilter !== "all" && notice.type !== typeFilter) return false;

    // Date range filter (based on publishedAt)
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (new Date(notice.publishedAt) < fromDate) return false;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(notice.publishedAt) > toDate) return false;
    }

    return true;
  });

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = search || statusFilter !== "all" || typeFilter !== "all" || dateFrom || dateTo;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notices & Announcements
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Manage company-wide announcements
          </p>
        </div>
        <Link href="/dashboard/notices/new">
          <Button>
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Notice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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
            placeholder="Search notices..."
            className="w-full rounded border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Types</option>
          <option value="GENERAL">General</option>
          <option value="IMPORTANT">Important</option>
          <option value="URGENT">Urgent</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        <span className="text-gray-400">to</span>

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Clear
          </button>
        )}

        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {filteredNotices.length} of {notices.length}
        </span>
      </div>

      {filteredNotices.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {hasActiveFilters ? "No notices match your filters" : "No notices yet"}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                Clear filters
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredNotices.map((notice) => (
            <Card key={notice.id} className={`${!notice.isActive || isExpired(notice) ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{notice.title}</h3>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColors[notice.type]}`}
                    >
                      {notice.type.charAt(0) + notice.type.slice(1).toLowerCase()}
                    </span>
                    {!notice.isActive && (
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        Inactive
                      </span>
                    )}
                    {isExpired(notice) && (
                      <span className="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {notice.content}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      By {notice.createdBy.firstName} {notice.createdBy.lastName}
                    </span>
                    <span>·</span>
                    <span>{new Date(notice.publishedAt).toLocaleDateString()}</span>
                    {notice.expiresAt && (
                      <>
                        <span>·</span>
                        <span>Expires: {new Date(notice.expiresAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(notice.id, notice.isActive)}
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      notice.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {notice.isActive ? "Active" : "Inactive"}
                  </button>
                  <Link href={`/dashboard/notices/${notice.id}/edit`}>
                    <Button variant="ghost" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(notice.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
