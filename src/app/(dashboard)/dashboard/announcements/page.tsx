"use client";

import { useEffect, useState } from "react";

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
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setNotices(data.data.notices);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Announcements</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          Company news and updates
        </p>
      </div>

      {notices.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <MegaphoneIcon className="h-6 w-6 text-gray-400" />
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No announcements</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notices.map((notice) => (
            <button
              key={notice.id}
              onClick={() => setSelectedNotice(notice)}
              className={`flex w-full items-center gap-3 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-r-lg transition-colors border-l-2 pl-3 ${
                notice.type === "URGENT"
                  ? "border-l-red-500"
                  : notice.type === "IMPORTANT"
                  ? "border-l-yellow-500"
                  : "border-l-blue-500"
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {notice.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {notice.createdBy.firstName} {notice.createdBy.lastName}
                </p>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                {formatDate(notice.publishedAt)}
              </span>
              <ChevronRightIcon className="h-4 w-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Detail Sidebar */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedNotice(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-gray-900">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <span className={`text-xs font-medium uppercase ${
                  selectedNotice.type === "URGENT"
                    ? "text-red-600 dark:text-red-400"
                    : selectedNotice.type === "IMPORTANT"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-blue-600 dark:text-blue-400"
                }`}>
                  {selectedNotice.type}
                </span>
                <button
                  onClick={() => setSelectedNotice(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedNotice.title}
                </h2>

                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{selectedNotice.createdBy.firstName} {selectedNotice.createdBy.lastName}</span>
                  <span>·</span>
                  <span>{new Date(selectedNotice.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric"
                  })}</span>
                </div>

                <div className="mt-6 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {selectedNotice.content}
                </div>

                {selectedNotice.expiresAt && (
                  <div className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                    Expires: {new Date(selectedNotice.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
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
