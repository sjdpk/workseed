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

      {notices.length === 0 ? (
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
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No notices yet</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => (
            <Card key={notice.id} className={`${!notice.isActive ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{notice.title}</h3>
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
