"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, useToast } from "@/components";

interface EmailStats {
  total: number;
  pending: number;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  todaySent: number;
  todayFailed: number;
  weekSent: number;
  weekFailed: number;
}

interface QueueStatus {
  smtpConfigured: boolean;
  pendingCount: number;
  stats: EmailStats;
}

export default function NotificationsOverviewPage() {
  const toast = useToast();
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/notifications/queue");
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch {
      toast.error("Failed to fetch queue status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processQueue = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/notifications/queue?action=process", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Processed ${data.data.processed} emails (${data.data.sent} sent, ${data.data.failed} failed)`);
        fetchStatus();
      } else {
        toast.error(data.error || "Failed to process queue");
      }
    } catch {
      toast.error("Failed to process queue");
    } finally {
      setProcessing(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/notifications/queue?action=test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.data.message);
      } else {
        toast.error(data.data?.message || data.error || "Test failed");
      }
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  const stats = status?.stats;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Email Notifications</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage templates, rules, and view logs
        </p>
      </div>

      {/* SMTP Status */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div
            className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${status?.smtpConfigured ? "bg-green-500" : "bg-red-500"}`}
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {status?.smtpConfigured ? "SMTP Configured" : "SMTP Not Configured"}
          </span>
          {!status?.smtpConfigured && (
            <span className="w-full text-xs text-gray-500 sm:w-auto">
              Set SMTP_USER and SMTP_PASSWORD in .env
            </span>
          )}
        </div>
      </Card>

      {/* Stats Grid - 2x2 on mobile, 4 on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Total</p>
          <p className="mt-1 text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">
            {stats?.total || 0}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Sent Today</p>
          <p className="mt-1 text-xl font-semibold text-green-600 dark:text-green-400 sm:text-2xl">
            {stats?.todaySent || 0}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">Failed Today</p>
          <p className="mt-1 text-xl font-semibold text-red-600 dark:text-red-400 sm:text-2xl">
            {stats?.todayFailed || 0}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">In Queue</p>
          <p className="mt-1 text-xl font-semibold text-yellow-600 dark:text-yellow-400 sm:text-2xl">
            {(stats?.pending || 0) + (stats?.queued || 0)}
          </p>
        </Card>
      </div>

      {/* Test Email & Process Queue - Stack on mobile */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <Card className="p-3 sm:p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Test Email</h3>
          <p className="mb-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            Verify your SMTP settings
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="testEmail"
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={sendTestEmail}
              disabled={testing || !status?.smtpConfigured}
              className="w-full sm:w-auto"
            >
              {testing ? "Sending..." : "Send"}
            </Button>
          </div>
        </Card>

        <Card className="p-3 sm:p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Process Queue</h3>
          <p className="mb-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            Manually process pending emails
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {(stats?.pending || 0) + (stats?.queued || 0)} pending
            </span>
            <Button
              onClick={processQueue}
              disabled={processing || !status?.smtpConfigured}
              variant="outline"
            >
              {processing ? "Processing..." : "Process"}
            </Button>
          </div>
        </Card>
      </div>

          </div>
  );
}
