"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components";

interface Notice {
  id: string;
  title: string;
  content: string;
  type: "GENERAL" | "IMPORTANT" | "URGENT";
  publishedAt: string;
  expiresAt: string | null;
  createdBy: { firstName: string; lastName: string };
}

export default function AnnouncementsPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setNotices(data.data.notices);
        setLoading(false);
      });
  }, []);

  const typeConfig = {
    URGENT: {
      bg: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
      icon: "text-red-500",
    },
    IMPORTANT: {
      bg: "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800",
      badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
      icon: "text-yellow-500",
    },
    GENERAL: {
      bg: "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700",
      badge: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
      icon: "text-gray-500",
    },
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Stay updated with company news and important information
        </p>
      </div>

      {notices.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
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
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No announcements at this time</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => {
            const config = typeConfig[notice.type];
            return (
              <div
                key={notice.id}
                className={`rounded border p-5 ${config.bg}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 ${config.icon}`}>
                    {notice.type === "URGENT" ? (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : notice.type === "IMPORTANT" ? (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {notice.title}
                      </h3>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${config.badge}`}>
                        {notice.type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {notice.content}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span>{notice.createdBy.firstName} {notice.createdBy.lastName}</span>
                      <span>·</span>
                      <span>{formatDate(notice.publishedAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
