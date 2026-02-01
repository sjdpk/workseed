"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Input } from "@/components";

export default function NewNoticePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "GENERAL" as "GENERAL" | "IMPORTANT" | "URGENT",
    expiresAt: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          expiresAt: formData.expiresAt || undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to create notice");
        return;
      }

      router.push("/dashboard/notices");
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Create Notice</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Publish a new announcement
          </p>
        </div>
        <Link href="/dashboard/notices">
          <Button variant="outline" size="sm">
            Cancel
          </Button>
        </Link>
      </div>

      <Card>
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="title"
            label="Title *"
            placeholder="Enter notice title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div>
            <label
              htmlFor="content"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Content *
            </label>
            <textarea
              id="content"
              rows={5}
              placeholder="Write your announcement..."
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:border-white dark:focus:ring-white"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as typeof formData.type })
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                <option value="GENERAL">General</option>
                <option value="IMPORTANT">Important</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <Input
              id="expiresAt"
              type="date"
              label="Expires On (optional)"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? "Publishing..." : "Publish Notice"}
            </Button>
            <Link href="/dashboard/notices">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
