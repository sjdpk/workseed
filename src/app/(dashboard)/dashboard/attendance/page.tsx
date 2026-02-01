"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, useToast } from "@/components";

interface AttendanceRecord {
  id: string;
  checkIn: string;
  checkOut: string | null;
  date: string;
}

interface CurrentStatus {
  isCheckedIn: boolean;
  todayRecord: AttendanceRecord | null;
}

export default function AttendancePage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [status, setStatus] = useState<CurrentStatus>({ isCheckedIn: false, todayRecord: null });
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
    ]).then(async ([meData, orgData]) => {
      if (!meData.success) {
        router.push("/login");
        return;
      }

      const user = meData.data.user;
      const attendance = orgData.data?.settings?.permissions?.onlineAttendance;

      // Check if user has access
      let canAccess = false;
      if (attendance?.enabled) {
        if (attendance.scope === "all") {
          canAccess = true;
        } else if (attendance.scope === "department" && user.departmentId) {
          canAccess = attendance.departmentIds?.includes(user.departmentId) || false;
        } else if (attendance.scope === "team" && user.teamId) {
          canAccess = attendance.teamIds?.includes(user.teamId) || false;
        } else if (attendance.scope === "specific") {
          canAccess = attendance.userIds?.includes(user.id) || false;
        }
      }

      setHasAccess(canAccess);

      if (canAccess) {
        const [statusRes, historyRes] = await Promise.all([
          fetch("/api/attendance/status").then((r) => r.json()),
          fetch("/api/attendance/history").then((r) => r.json()),
        ]);

        if (statusRes.success) {
          setStatus(statusRes.data);
        }
        if (historyRes.success) {
          setHistory(historyRes.data.records || []);
        }
      }

      setLoading(false);
    });
  }, [router]);

  const handleCheckIn = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/attendance/checkin", { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to check in");
        return;
      }

      setStatus({ isCheckedIn: true, todayRecord: data.data.record });
      toast.success("Checked in");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/attendance/checkout", { method: "POST" });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to check out");
        return;
      }

      setStatus({ isCheckedIn: false, todayRecord: data.data.record });
      setHistory((prev) => [data.data.record, ...prev.filter((r) => r.id !== data.data.record.id)]);
      toast.success("Checked out");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setProcessing(false);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    const start = new Date(checkIn);
    const end = checkOut ? new Date(checkOut) : new Date();
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance</h1>
        </div>
        <div className="py-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Online attendance is not available for you
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance</h1>
      </div>

      {/* Current Time & Action */}
      <div className="max-w-md mx-auto text-center">
        <p className="text-4xl font-light text-gray-900 dark:text-white tabular-nums">
          {currentTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {currentTime.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </p>

        <div className="mt-8">
          {status.isCheckedIn ? (
            <Button
              onClick={handleCheckOut}
              disabled={processing}
              className="px-12 py-3 text-lg bg-red-600 hover:bg-red-700"
            >
              {processing ? "..." : "Check Out"}
            </Button>
          ) : (
            <Button
              onClick={handleCheckIn}
              disabled={processing}
              className="px-12 py-3 text-lg bg-green-600 hover:bg-green-700"
            >
              {processing ? "..." : "Check In"}
            </Button>
          )}
        </div>

        {status.todayRecord && (
          <div className="mt-6 rounded-md bg-gray-50 p-4 dark:bg-gray-800">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">In </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatTime(status.todayRecord.checkIn)}
                </span>
              </div>
              {status.todayRecord.checkOut && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Out </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatTime(status.todayRecord.checkOut)}
                  </span>
                </div>
              )}
              <div className="text-gray-900 dark:text-white font-medium">
                {calculateDuration(status.todayRecord.checkIn, status.todayRecord.checkOut)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-4">History</h2>
          <div className="space-y-2">
            {history.slice(0, 7).map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 dark:bg-gray-800 text-sm"
              >
                <span className="text-gray-600 dark:text-gray-400">{formatDate(record.date)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-900 dark:text-white">
                    {formatTime(record.checkIn)} →{" "}
                    {record.checkOut ? formatTime(record.checkOut) : "-"}
                  </span>
                  <span className="text-xs text-gray-500 w-14 text-right">
                    {record.checkOut ? calculateDuration(record.checkIn, record.checkOut) : "-"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
