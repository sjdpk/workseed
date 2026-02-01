"use client";

import { useEffect, useState, useRef } from "react";
import { Button, Card, Input } from "@/components";

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: "PUBLIC" | "OPTIONAL" | "RESTRICTED";
  description: string | null;
  isActive: boolean;
}

interface UserInfo {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
}

export default function HolidaysPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: "",
    date: "",
    type: "PUBLIC",
    description: "",
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setUser(data.data.user);
      });
  }, []);

  const canManage = user?.role === "ADMIN" || user?.role === "HR";

  useEffect(() => {
    fetchHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const fetchHolidays = async () => {
    setLoading(true);
    const res = await fetch(`/api/holidays?year=${year}`);
    const data = await res.json();
    if (data.success) {
      setHolidays(data.data.holidays);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const url = editingHoliday ? `/api/holidays/${editingHoliday.id}` : "/api/holidays";
    const method = editingHoliday ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      closeSidebar();
      fetchHolidays();
    }
    setSaving(false);
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setForm({
      name: holiday.name,
      date: holiday.date.split("T")[0],
      type: holiday.type,
      description: holiday.description || "",
    });
    setShowSidebar(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    const res = await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    if (res.ok) fetchHolidays();
  };

  const closeSidebar = () => {
    setShowSidebar(false);
    setEditingHoliday(null);
    setForm({ name: "", date: "", type: "PUBLIC", description: "" });
  };

  const openAddSidebar = () => {
    setEditingHoliday(null);
    setForm({ name: "", date: "", type: "PUBLIC", description: "" });
    setShowSidebar(true);
  };

  const handleExportCSV = () => {
    if (holidays.length === 0) return;

    const headers = ["Name", "Date", "Type", "Description"];
    const rows = holidays.map((h) => [h.name, h.date.split("T")[0], h.type, h.description || ""]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `holidays-${year}.csv`;
    link.click();
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    // Skip header row
    const dataLines = lines.slice(1);
    let imported = 0;

    for (const line of dataLines) {
      const matches = line.match(/("([^"]|"")*"|[^,]*)(,("([^"]|"")*"|[^,]*))*$/);
      if (!matches) continue;

      // Parse CSV line
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const [name, date, type, description] = values;

      if (name && date) {
        const holidayType = ["PUBLIC", "OPTIONAL", "RESTRICTED"].includes(type?.toUpperCase())
          ? type.toUpperCase()
          : "PUBLIC";

        try {
          const res = await fetch("/api/holidays", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              date,
              type: holidayType,
              description: description || "",
            }),
          });
          if (res.ok) imported++;
        } catch {
          // Continue with next row
        }
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setImporting(false);
    fetchHolidays();
    alert(`Imported ${imported} holiday${imported !== 1 ? "s" : ""}`);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "PUBLIC":
        return "bg-gray-900 text-white dark:bg-white dark:text-gray-900";
      case "OPTIONAL":
        return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      case "RESTRICTED":
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Holiday Calendar</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Company holidays for {year}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={holidays.length === 0}
              >
                <DownloadIcon className="mr-1.5 h-4 w-4" />
                Export
              </Button>
              <label
                className={`inline-flex cursor-pointer items-center justify-center rounded px-3 py-1.5 text-xs font-medium transition-colors border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-transparent dark:text-gray-200 dark:hover:bg-gray-800 ${importing ? "opacity-50 pointer-events-none" : ""}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
                <UploadIcon className="mr-1.5 h-4 w-4" />
                {importing ? "Importing..." : "Import"}
              </label>
              <Button size="sm" onClick={openAddSidebar}>
                Add Holiday
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
        </div>
      ) : holidays.length === 0 ? (
        <Card>
          <div className="py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <CalendarIcon className="h-6 w-6 text-gray-400" />
            </div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No holidays for {year}</p>
            {canManage && (
              <button
                onClick={openAddSidebar}
                className="mt-4 text-sm font-medium text-gray-900 hover:underline dark:text-white"
              >
                Add your first holiday
              </button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {holidays.map((holiday) => (
            <div
              key={holiday.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 flex-col items-center justify-center rounded-md bg-gray-100 dark:bg-gray-700">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {new Date(holiday.date).toLocaleDateString("en-US", { month: "short" })}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Date(holiday.date).getDate()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {holiday.name}
                    </p>
                    <span
                      className={`rounded px-1 py-0.5 text-[10px] font-medium ${getTypeColor(holiday.type)}`}
                    >
                      {holiday.type.charAt(0) + holiday.type.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(holiday.date)}
                    {holiday.description && ` · ${holiday.description}`}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(holiday)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(holiday.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Slide-in Sidebar */}
      {showSidebar && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={closeSidebar} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-xl dark:bg-gray-900">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingHoliday ? "Edit Holiday" : "Add Holiday"}
                </h2>
                <button
                  onClick={closeSidebar}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex-1 space-y-4 p-6">
                <Input
                  id="name"
                  label="Holiday Name *"
                  placeholder="e.g., New Year's Day"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />

                <Input
                  id="date"
                  type="date"
                  label="Date *"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Type
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "PUBLIC", label: "Public", desc: "Paid day off" },
                      { value: "OPTIONAL", label: "Optional", desc: "Choose to take" },
                      { value: "RESTRICTED", label: "Restricted", desc: "Limited access" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm({ ...form, type: option.value })}
                        className={`rounded-md border p-3 text-left transition-colors ${
                          form.type === option.value
                            ? "border-gray-900 bg-gray-50 dark:border-white dark:bg-gray-800"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                        }`}
                      >
                        <p
                          className={`text-sm font-medium ${
                            form.type === option.value
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {option.label}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {option.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  id="description"
                  label="Description (optional)"
                  placeholder="Brief description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : editingHoliday ? "Save Changes" : "Add Holiday"}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeSidebar}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
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

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
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
