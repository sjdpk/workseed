"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, Input, Select, useToast } from "@/components";

interface EmailTemplate {
  id: string;
  name: string;
  displayName: string;
  type: string;
  subject: string;
  htmlBody: string;
  variables: Record<string, string> | null;
  isActive: boolean;
  isSystem: boolean;
}

const TYPE_OPTIONS = [
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

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const isNew = params.id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    type: "CUSTOM",
    subject: "",
    htmlBody: "",
    isActive: true,
  });

  const [template, setTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    if (!isNew) {
      fetchTemplate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/notifications/templates/${params.id}`);
      const data = await res.json();
      if (data.success) {
        const t = data.data.template;
        setTemplate(t);
        setFormData({
          name: t.name,
          displayName: t.displayName,
          type: t.type,
          subject: t.subject,
          htmlBody: t.htmlBody,
          isActive: t.isActive,
        });
      } else {
        toast.error("Template not found");
        router.push("/dashboard/notifications/templates");
      }
    } catch {
      toast.error("Failed to fetch template");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew
        ? "/api/notifications/templates"
        : `/api/notifications/templates/${params.id}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(isNew ? "Template created" : "Template updated");
        if (isNew) {
          router.push(`/dashboard/notifications/templates/${data.data.template.id}`);
        } else {
          fetchTemplate();
        }
      } else {
        toast.error(data.error || "Failed to save template");
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      // For new templates, we need to preview without saving
      if (isNew) {
        // Just show a simple preview
        setPreviewHtml(`
          <div style="font-family: sans-serif; padding: 20px;">
            <h3>Preview not available for new templates</h3>
            <p>Save the template first to preview with sample data.</p>
          </div>
        `);
        return;
      }

      const res = await fetch(`/api/notifications/templates/${params.id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.success) {
        setPreviewHtml(data.data.html);
      } else {
        toast.error("Failed to preview template");
      }
    } catch {
      toast.error("Failed to preview template");
    } finally {
      setPreviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isNew ? "Create Template" : "Edit Template"}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {isNew ? "Create a new email template" : `Editing: ${template?.displayName}`}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/notifications/templates")}>
          Back to Templates
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isNew && (
              <>
                <Input
                  id="name"
                  label="Internal Name"
                  placeholder="e.g., custom_welcome_email"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Select
                  id="type"
                  label="Notification Type"
                  options={TYPE_OPTIONS}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                />
              </>
            )}

            <Input
              id="displayName"
              label="Display Name"
              placeholder="e.g., Welcome Email"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              required
            />

            <Input
              id="subject"
              label="Subject Line"
              placeholder="e.g., Welcome to {{appName}}, {{employeeName}}!"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                HTML Body
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                rows={15}
                placeholder="<h2 class='title'>Welcome!</h2>..."
                value={formData.htmlBody}
                onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Use {"{{variableName}}"} for dynamic content. Available CSS classes: title, subtitle,
                content, button, badge, info-row, info-label, info-value
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                Active (template will be used for notifications)
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : isNew ? "Create Template" : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={handlePreview} disabled={previewing}>
                {previewing ? "Loading..." : "Preview"}
              </Button>
            </div>
          </form>
        </Card>

        {/* Preview */}
        <Card>
          <h2 className="mb-4 text-sm font-medium text-gray-900 dark:text-white">Preview</h2>
          {previewHtml ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700">
              <iframe
                srcDoc={previewHtml}
                className="h-[600px] w-full rounded-lg bg-white"
                title="Email Preview"
              />
            </div>
          ) : (
            <div className="flex h-[600px] items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400">
              Click "Preview" to see how the email will look
            </div>
          )}
        </Card>
      </div>

      {/* Variables Reference */}
      {template?.variables && (
        <Card>
          <h2 className="mb-4 text-sm font-medium text-gray-900 dark:text-white">
            Available Variables
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(template.variables).map(([key, description]) => (
              <div key={key} className="rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
                <code className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {`{{${key}}}`}
                </code>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
