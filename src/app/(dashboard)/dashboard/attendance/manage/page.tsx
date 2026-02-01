"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, useToast } from "@/components";

const ALLOWED_ROLES = ["ADMIN", "HR", "MANAGER", "TEAM_LEAD"];

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  employeeId: string;
  department: string | null;
  team: string | null;
  date: string;
  checkIn: string;
  checkOut: string | null;
  source: string;
  deviceId: string | null;
  location: string | null;
}

interface Summary {
  total: number;
  present: number;
  absent: number;
}

interface Department {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

interface Device {
  id: string;
  name: string;
  type: string;
  deviceId: string;
  status: string;
  apiKey: string;
  lastSync: string | null;
}

const SOURCES = [
  { value: "", label: "All Sources" },
  { value: "WEB", label: "Web" },
  { value: "MOBILE", label: "Mobile App" },
  { value: "BIOMETRIC", label: "Biometric" },
  { value: "RFID", label: "RFID" },
  { value: "MANUAL", label: "Manual" },
];

export default function AttendanceManagePage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, present: 0, absent: 0 });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [userRole, setUserRole] = useState<string>("");

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedSource, setSelectedSource] = useState("");

  // Device setup
  const [showDeviceSetup, setShowDeviceSetup] = useState(false);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: "", type: "BIOMETRIC", deviceId: "" });
  const [savingDevice, setSavingDevice] = useState(false);
  const [createdDevice, setCreatedDevice] = useState<{
    name: string;
    deviceId: string;
    apiKey: string;
  } | null>(null);
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/attendance/devices")
        .then((r) => r.json())
        .catch(() => ({ success: false })),
    ]).then(([meData, deptData, teamData, deviceData]) => {
      if (!meData.success || !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }

      setUserRole(meData.data.user.role);
      if (deptData.success) setDepartments(deptData.data.departments || []);
      if (teamData.success) setTeams(teamData.data.teams || []);
      if (deviceData.success) setDevices(deviceData.data.devices || []);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (loading) return;
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedDepartment, selectedTeam, selectedSource, loading]);

  const fetchRecords = async () => {
    const params = new URLSearchParams();
    params.set("date", selectedDate);
    if (selectedDepartment) params.set("departmentId", selectedDepartment);
    if (selectedTeam) params.set("teamId", selectedTeam);
    if (selectedSource) params.set("source", selectedSource);

    const res = await fetch(`/api/attendance/records?${params}`);
    const data = await res.json();

    if (data.success) {
      setRecords(data.data.records);
      setSummary(data.data.summary);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    const start = new Date(checkIn);
    const end = checkOut ? new Date(checkOut) : null;
    if (!end) return "-";
    const diff = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      WEB: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
      MOBILE: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
      BIOMETRIC: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
      RFID: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
      MANUAL: "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
    return colors[source] || colors.MANUAL;
  };

  // Export attendance to CSV
  const exportCSV = () => {
    if (records.length === 0) {
      toast.error("No records to export");
      return;
    }

    const headers = [
      "Employee ID",
      "Name",
      "Department",
      "Team",
      "Date",
      "Check In",
      "Check Out",
      "Duration",
      "Source",
    ];
    const rows = records.map((r) => [
      r.employeeId,
      r.userName,
      r.department || "-",
      r.team || "-",
      selectedDate,
      formatTime(r.checkIn),
      r.checkOut ? formatTime(r.checkOut) : "-",
      calculateDuration(r.checkIn, r.checkOut),
      r.source,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance-${selectedDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported successfully");
  };

  const handleSaveDevice = async () => {
    if (!newDevice.name || !newDevice.deviceId) {
      toast.error("Please fill in all fields");
      return;
    }

    setSavingDevice(true);
    try {
      const res = await fetch("/api/attendance/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDevice),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to add device");
        return;
      }

      setDevices([...devices, data.data.device]);
      setCreatedDevice({
        name: data.data.device.name,
        deviceId: data.data.device.deviceId,
        apiKey: data.data.device.apiKey,
      });
      setNewDevice({ name: "", type: "BIOMETRIC", deviceId: "" });
      toast.success("Device added");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingDevice(false);
    }
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
            Attendance Management
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            View and manage employee attendance records
          </p>
        </div>
        {(userRole === "ADMIN" || userRole === "HR") && (
          <div className="flex items-center gap-2">
            {devices.length > 0 && (
              <Button variant="outline" onClick={() => setShowDeviceList(true)}>
                <DeviceIcon className="h-4 w-4 mr-1.5" />
                Devices ({devices.length})
              </Button>
            )}
            <Button onClick={() => setShowDeviceSetup(true)}>Add Device</Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{summary.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Employees</p>
        </div>
        <div className="rounded bg-green-50 p-4 dark:bg-green-900/20">
          <p className="text-2xl font-semibold text-green-700 dark:text-green-400">
            {summary.present}
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">Present</p>
        </div>
        <div className="rounded bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-2xl font-semibold text-red-700 dark:text-red-400">{summary.absent}</p>
          <p className="text-xs text-red-600 dark:text-red-500">Absent</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />

          {(userRole === "ADMIN" || userRole === "HR") && (
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {(userRole === "ADMIN" || userRole === "HR" || userRole === "MANAGER") && (
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {records.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <DownloadIcon />
            Export CSV
          </button>
        )}
      </div>

      {/* Records Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Employee
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Department
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Check In
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Check Out
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Duration
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-2">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{record.userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {record.employeeId}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {record.department || "-"}
                    {record.team && <span className="text-xs ml-1">/ {record.team}</span>}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                    {formatTime(record.checkIn)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                    {record.checkOut ? formatTime(record.checkOut) : "-"}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                    {calculateDuration(record.checkIn, record.checkOut)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${getSourceBadge(record.source)}`}
                    >
                      {record.source.charAt(0) + record.source.slice(1).toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
                    No attendance records for this date
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Device List Sidebar */}
      {showDeviceList && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowDeviceList(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-gray-900">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Connected Devices
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDocs(true)}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    API Docs
                  </button>
                  <button
                    onClick={() => setShowDeviceList(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="rounded-md border border-gray-200 p-3 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${device.status === "ACTIVE" ? "bg-green-500" : "bg-gray-400"}`}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {device.name}
                        </span>
                      </div>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete device "${device.name}"?`)) return;
                          try {
                            const res = await fetch(`/api/attendance/devices/${device.id}`, {
                              method: "DELETE",
                            });
                            const data = await res.json();
                            if (data.success) {
                              setDevices(devices.filter((d) => d.id !== device.id));
                              toast.success("Device deleted");
                              if (devices.length === 1) setShowDeviceList(false);
                            } else {
                              toast.error(data.error || "Failed to delete");
                            }
                          } catch {
                            toast.error("Something went wrong");
                          }
                        }}
                        className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                        title="Delete device"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Type</span>
                        <span className="text-gray-700 dark:text-gray-300">{device.type}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Device ID</span>
                        <span className="text-gray-700 dark:text-gray-300 font-mono">
                          {device.deviceId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Last Sync</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {device.lastSync ? new Date(device.lastSync).toLocaleString() : "Never"}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-400">API Key</span>
                          <button
                            onClick={() => {
                              if (navigator?.clipboard) {
                                navigator?.clipboard?.writeText(device.apiKey);
                                toast.success("API Key copied");
                              }
                            }}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <Button
                  onClick={() => {
                    setShowDeviceList(false);
                    setShowDeviceSetup(true);
                  }}
                  className="w-full"
                >
                  Add New Device
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device Setup Sidebar */}
      {showDeviceSetup && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => {
              setShowDeviceSetup(false);
              setCreatedDevice(null);
            }}
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-gray-900">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {createdDevice ? "Device Configuration" : "Add Attendance Device"}
                </h2>
                <button
                  onClick={() => {
                    setShowDeviceSetup(false);
                    setCreatedDevice(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {createdDevice ? (
                  <>
                    {/* Success Message */}
                    <div className="rounded bg-green-50 p-3 dark:bg-green-900/20">
                      <p className="text-sm font-medium text-green-800 dark:text-green-400">
                        Device &quot;{createdDevice.name}&quot; added successfully!
                      </p>
                    </div>

                    {/* API Key - Show only once */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        API Key (save this - shown only once)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={createdDevice.apiKey}
                          readOnly
                          className="flex-1 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        <button
                          onClick={() => {
                            navigator?.clipboard?.writeText(createdDevice.apiKey);
                            toast.success("API Key copied");
                          }}
                          className="rounded border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Webhook URL */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Webhook URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={`${typeof window !== "undefined" ? window.location.origin : ""}/api/attendance/webhook`}
                          readOnly
                          className="flex-1 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                        <button
                          onClick={() => {
                            navigator?.clipboard?.writeText(
                              `${window.location.origin}/api/attendance/webhook`
                            );
                            toast.success("URL copied");
                          }}
                          className="rounded border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {/* Configuration Guide */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Configuration Guide
                      </h3>

                      <div className="rounded bg-gray-50 p-3 dark:bg-gray-800 space-y-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          1. Configure your device to POST to:
                        </p>
                        <code className="block text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                          POST /api/attendance/webhook
                        </code>
                      </div>

                      <div className="rounded bg-gray-50 p-3 dark:bg-gray-800 space-y-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          2. Add header for authentication:
                        </p>
                        <code className="block text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">
                          X-API-Key: {createdDevice.apiKey.slice(0, 8)}...
                        </code>
                      </div>

                      <div className="rounded bg-gray-50 p-3 dark:bg-gray-800 space-y-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          3. Send JSON body:
                        </p>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                          {`{
  "employeeId": "EMP001",
  "action": "IN"
}`}
                        </pre>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          action: &quot;IN&quot; for check-in, &quot;OUT&quot; for check-out
                        </p>
                      </div>

                      <div className="rounded bg-gray-50 p-3 dark:bg-gray-800 space-y-2">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          4. Example cURL:
                        </p>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {`curl -X POST \\
  ${typeof window !== "undefined" ? window.location.origin : "https://yoursite.com"}/api/attendance/webhook \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"employeeId":"EMP001","action":"IN"}'`}
                        </pre>
                      </div>
                    </div>

                    <div className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                      <p className="text-xs text-amber-800 dark:text-amber-400">
                        <strong>Important:</strong> Save the API key now. It cannot be retrieved
                        later for security reasons.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Device Name
                      </label>
                      <input
                        type="text"
                        value={newDevice.name}
                        onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
                        placeholder="e.g., Main Entrance"
                        className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Device Type
                      </label>
                      <select
                        value={newDevice.type}
                        onChange={(e) => setNewDevice({ ...newDevice, type: e.target.value })}
                        className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        <option value="BIOMETRIC">Biometric (Fingerprint)</option>
                        <option value="RFID">RFID Card Reader</option>
                        <option value="FACE">Face Recognition</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Device ID / Serial
                      </label>
                      <input
                        type="text"
                        value={newDevice.deviceId}
                        onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })}
                        placeholder="e.g., BIO-001"
                        className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>

                    <div className="rounded bg-gray-50 p-3 dark:bg-gray-800">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        After adding a device, you&apos;ll receive an API key and configuration guide to
                        integrate with your biometric/RFID hardware.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                {createdDevice ? (
                  <Button
                    onClick={() => {
                      setShowDeviceSetup(false);
                      setCreatedDevice(null);
                    }}
                    className="w-full"
                  >
                    Done
                  </Button>
                ) : (
                  <Button onClick={handleSaveDevice} disabled={savingDevice} className="w-full">
                    {savingDevice ? "Adding..." : "Add Device"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Documentation Sidebar */}
      {showDocs && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowDocs(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl dark:bg-gray-900">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  API Documentation
                </h2>
                <button
                  onClick={() => setShowDocs(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Endpoint */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Webhook Endpoint
                  </h3>
                  <div className="flex gap-2">
                    <code className="flex-1 rounded bg-gray-100 px-3 py-2 text-xs font-mono dark:bg-gray-800 dark:text-white break-all">
                      POST {typeof window !== "undefined" ? window.location.origin : ""}
                      /api/attendance/webhook
                    </code>
                    <button
                      onClick={() => {
                        navigator?.clipboard?.writeText(
                          `${window.location.origin}/api/attendance/webhook`
                        );
                        toast.success("Copied");
                      }}
                      className="rounded border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Headers
                  </h3>
                  <div className="rounded bg-gray-50 dark:bg-gray-800 overflow-hidden">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <td className="px-3 py-2 font-mono font-medium text-gray-700 dark:text-gray-300">
                            X-API-Key
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            Your device API key (required)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono font-medium text-gray-700 dark:text-gray-300">
                            Content-Type
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            application/json
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Request Body */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Request Body
                  </h3>
                  <pre className="rounded bg-gray-50 p-3 text-xs font-mono dark:bg-gray-800 dark:text-white overflow-x-auto">
                    {`{
  "employeeId": "EMP001",
  "action": "IN",
  "timestamp": "2024-01-15T09:00:00Z",  // optional
  "location": "Main Entrance"            // optional
}`}
                  </pre>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        employeeId
                      </span>{" "}
                      - Employee ID in your system (required)
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">action</span> -
                      &quot;IN&quot; for check-in, &quot;OUT&quot; for check-out (required)
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        timestamp
                      </span>{" "}
                      - ISO 8601 datetime (optional, defaults to now)
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">location</span>{" "}
                      - Location info (optional)
                    </p>
                  </div>
                </div>

                {/* Response */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Response
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Success (200):</p>
                  <pre className="rounded bg-green-50 p-3 text-xs font-mono dark:bg-green-900/20 dark:text-green-400 overflow-x-auto">
                    {`{
  "success": true,
  "message": "Check-in recorded",
  "data": {
    "employeeId": "EMP001",
    "name": "John Doe",
    "action": "IN",
    "time": "2024-01-15T09:00:00.000Z"
  }
}`}
                  </pre>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 mb-2">Error (4xx):</p>
                  <pre className="rounded bg-red-50 p-3 text-xs font-mono dark:bg-red-900/20 dark:text-red-400 overflow-x-auto">
                    {`{
  "success": false,
  "error": "Already checked in today"
}`}
                  </pre>
                </div>

                {/* Example */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Example (cURL)
                  </h3>
                  <div className="relative">
                    <pre className="rounded bg-gray-900 p-3 text-xs font-mono text-gray-100 overflow-x-auto">
                      {`curl -X POST \\
  ${typeof window !== "undefined" ? window.location.origin : "https://yoursite.com"}/api/attendance/webhook \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"employeeId":"EMP001","action":"IN"}'`}
                    </pre>
                    <button
                      onClick={() => {
                        const cmd = `curl -X POST ${window.location.origin}/api/attendance/webhook -H "X-API-Key: YOUR_API_KEY" -H "Content-Type: application/json" -d '{"employeeId":"EMP001","action":"IN"}'`;
                        navigator?.clipboard?.writeText(cmd);
                        toast.success("Copied");
                      }}
                      className="absolute top-2 right-2 rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Test Connection */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Test Connection
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Use GET request to test if your API key is valid:
                  </p>
                  <pre className="rounded bg-gray-900 p-3 text-xs font-mono text-gray-100 overflow-x-auto">
                    {`curl ${typeof window !== "undefined" ? window.location.origin : "https://yoursite.com"}/api/attendance/webhook \\
  -H "X-API-Key: YOUR_API_KEY"`}
                  </pre>
                </div>

                {/* Error Codes */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Error Codes
                  </h3>
                  <div className="rounded bg-gray-50 dark:bg-gray-800 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Code
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-300">
                            Description
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr>
                          <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">
                            401
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            Missing or invalid API key
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">
                            400
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            Invalid request / Already checked in
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">
                            404
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            Employee not found
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">
                            500
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            Server error
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Note */}
                <div className="rounded border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="text-xs text-blue-800 dark:text-blue-400">
                    <strong>Note:</strong> API keys are generated when adding a device and shown
                    only once. If you lose your API key, add a new device to get a new key.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <Button onClick={() => setShowDocs(false)} className="w-full">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function DownloadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function DeviceIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
      />
    </svg>
  );
}
