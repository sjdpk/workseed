"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, useToast } from "@/components";

interface EmailTemplate {
  id: string;
  name: string;
  displayName: string;
  type: string;
  subject: string;
  isActive: boolean;
  isSystem: boolean;
  updatedAt: string;
}

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "LEAVE_REQUEST_SUBMITTED", label: "Leave Request Submitted" },
  { value: "LEAVE_REQUEST_APPROVED", label: "Leave Request Approved" },
  { value: "LEAVE_REQUEST_REJECTED", label: "Leave Request Rejected" },
  { value: "LEAVE_REQUEST_CANCELLED", label: "Leave Request Cancelled" },
  { value: "LEAVE_PENDING_APPROVAL", label: "Leave Pending Approval" },
  { value: "REQUEST_SUBMITTED", label: "Request Submitted" },
  { value: "REQUEST_APPROVED", label: "Request Approved" },
  { value: "REQUEST_REJECTED", label: "Request Rejected" },
  { value: "ANNOUNCEMENT_PUBLISHED", label: "Announcement Published" },
  { value: "BIRTHDAY_REMINDER", label: "Birthday Reminder" },
  { value: "WORK_ANNIVERSARY", label: "Work Anniversary" },
  { value: "ASSET_ASSIGNED", label: "Asset Assigned" },
  { value: "ASSET_RETURNED", label: "Asset Returned" },
  { value: "WELCOME_EMAIL", label: "Welcome Email" },
  { value: "PASSWORD_RESET", label: "Password Reset" },
  { value: "APPRECIATION", label: "Appreciation" },
  { value: "CUSTOM", label: "Custom" },
];

export default function TemplatesPage() {
  const toast = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append("type", typeFilter);

      const res = await fetch(`/api/notifications/templates?${params}`);
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data.templates);
      }
    } catch {
      toast.error("Failed to fetch templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/notifications/templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Template ${!currentStatus ? "activated" : "deactivated"}`);
        fetchTemplates();
      } else {
        toast.error(data.error || "Failed to update template");
      }
    } catch {
      toast.error("Failed to update template");
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`/api/notifications/templates/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Template deleted");
        fetchTemplates();
      } else {
        toast.error(data.error || "Failed to delete template");
      }
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTypeBadgeColor = (type: string) => {
    if (type.includes("APPROVED")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    if (type.includes("REJECTED")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (type.includes("PENDING") || type.includes("SUBMITTED"))
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  // Filter templates by search (client-side)
  const filteredTemplates = templates.filter((template) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      template.displayName.toLowerCase().includes(searchLower) ||
      template.name.toLowerCase().includes(searchLower) ||
      template.subject.toLowerCase().includes(searchLower) ||
      template.type.toLowerCase().includes(searchLower)
    );
  });

  const hasActiveFilters = search || typeFilter;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Email Templates</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage email templates for notifications
          </p>
        </div>
        <Link href="/dashboard/notifications/templates/new">
          <Button>Create Template</Button>
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
            placeholder="Search templates..."
            className="w-full rounded border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearch("");
              setTypeFilter("");
            }}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>

      {/* Templates Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">
            {hasActiveFilters
              ? "No templates match your filters"
              : "No templates found. Create your first template or run the seed to create default templates."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Template
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Updated
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTemplates.map((template) => (
                  <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {template.displayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{template.name}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                          Subject: {template.subject}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-medium ${getTypeBadgeColor(template.type)}`}
                      >
                        {template.type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                            template.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </span>
                        {template.isSystem && (
                          <span className="inline-flex rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            System
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(template.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dashboard/notifications/templates/${template.id}`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(template.id, template.isActive)}
                        >
                          {template.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        {!template.isSystem && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTemplate(template.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
