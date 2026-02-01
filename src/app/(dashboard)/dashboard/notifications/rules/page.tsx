"use client";

import { useEffect, useState } from "react";
import { Button, Card, useToast } from "@/components";

interface NotificationRule {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  recipientConfig: {
    notifyRequester: boolean;
    notifyManager: boolean;
    notifyTeamLead: boolean;
    notifyHR: boolean;
    notifyAdmin: boolean;
  };
}

const NOTIFICATION_TYPES = [
  { value: "LEAVE_REQUEST_SUBMITTED", label: "Leave Submitted" },
  { value: "LEAVE_REQUEST_APPROVED", label: "Leave Approved" },
  { value: "LEAVE_REQUEST_REJECTED", label: "Leave Rejected" },
  { value: "REQUEST_SUBMITTED", label: "Request Submitted" },
  { value: "REQUEST_APPROVED", label: "Request Approved" },
  { value: "REQUEST_REJECTED", label: "Request Rejected" },
  { value: "ANNOUNCEMENT_PUBLISHED", label: "Announcement" },
  { value: "WELCOME_EMAIL", label: "Welcome Email" },
  { value: "ASSET_ASSIGNED", label: "Asset Assigned" },
];

const RECIPIENTS = [
  { key: "notifyRequester", label: "Requester" },
  { key: "notifyManager", label: "Manager" },
  { key: "notifyTeamLead", label: "Team Lead" },
  { key: "notifyHR", label: "HR" },
  { key: "notifyAdmin", label: "Admin" },
];

export default function NotificationRulesPage() {
  const toast = useToast();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/notifications/rules");
      const data = await res.json();
      if (data.success) {
        setRules(data.data.rules);
      }
    } catch {
      toast.error("Failed to fetch rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getRule = (type: string): NotificationRule | undefined => {
    return rules.find((r) => r.type === type);
  };

  const updateRule = (type: string, field: string, value: boolean) => {
    setHasChanges(true);
    setRules((prev) => {
      const existing = prev.find((r) => r.type === type);
      if (existing) {
        return prev.map((r) =>
          r.type === type
            ? field === "isActive"
              ? { ...r, isActive: value }
              : { ...r, recipientConfig: { ...r.recipientConfig, [field]: value } }
            : r
        );
      }
      const typeInfo = NOTIFICATION_TYPES.find((t) => t.value === type);
      const newRule: NotificationRule = {
        id: "",
        type,
        name: typeInfo?.label || type,
        isActive: field === "isActive" ? value : true,
        recipientConfig: {
          notifyRequester: field === "notifyRequester" ? value : true,
          notifyManager: field === "notifyManager" ? value : false,
          notifyTeamLead: field === "notifyTeamLead" ? value : false,
          notifyHR: field === "notifyHR" ? value : false,
          notifyAdmin: field === "notifyAdmin" ? value : false,
        },
      };
      return [...prev, newRule];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const type of NOTIFICATION_TYPES) {
        const rule = getRule(type.value);
        if (!rule) continue;

        if (rule.id) {
          await fetch(`/api/notifications/rules/${rule.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              isActive: rule.isActive,
              recipientConfig: rule.recipientConfig,
            }),
          });
        } else {
          await fetch("/api/notifications/rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: type.value,
              name: type.label,
              isActive: rule.isActive,
              recipientConfig: rule.recipientConfig,
            }),
          });
        }
      }
      toast.success("Rules saved");
      setHasChanges(false);
      fetchRules();
    } catch {
      toast.error("Failed to save rules");
    } finally {
      setSaving(false);
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
            Notification Rules
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure who receives each notification
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Notification
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Enabled
                </th>
                {RECIPIENTS.map((r) => (
                  <th
                    key={r.key}
                    className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400"
                  >
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {NOTIFICATION_TYPES.map((type) => {
                const rule = getRule(type.value);
                const isActive = rule?.isActive ?? false;

                return (
                  <tr key={type.value}>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                      {type.label}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => updateRule(type.value, "isActive", e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    {RECIPIENTS.map((r) => {
                      const checked =
                        rule?.recipientConfig[r.key as keyof typeof rule.recipientConfig] ?? false;
                      return (
                        <td key={r.key} className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => updateRule(type.value, r.key, e.target.checked)}
                            disabled={!isActive}
                            className="rounded border-gray-300 dark:border-gray-600 disabled:opacity-30"
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Requester = person who submitted the request or is the subject of the notification.
        </p>
      </Card>
    </div>
  );
}
