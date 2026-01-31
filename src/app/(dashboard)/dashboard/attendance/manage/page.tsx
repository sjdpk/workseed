"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  status: string;
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
  const [newDevice, setNewDevice] = useState({ name: "", type: "BIOMETRIC", deviceId: "" });
  const [savingDevice, setSavingDevice] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
      fetch("/api/attendance/devices").then((r) => r.json()).catch(() => ({ success: false })),
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
      setNewDevice({ name: "", type: "BIOMETRIC", deviceId: "" });
      setShowDeviceSetup(false);
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
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Management</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">View and manage employee attendance records</p>
        </div>
        {(userRole === "ADMIN" || userRole === "HR") && (
          <Button onClick={() => setShowDeviceSetup(true)}>
            Add Device
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{summary.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Employees</p>
        </div>
        <div className="rounded bg-green-50 p-4 dark:bg-green-900/20">
          <p className="text-2xl font-semibold text-green-700 dark:text-green-400">{summary.present}</p>
          <p className="text-xs text-green-600 dark:text-green-500">Present</p>
        </div>
        <div className="rounded bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-2xl font-semibold text-red-700 dark:text-red-400">{summary.absent}</p>
          <p className="text-xs text-red-600 dark:text-red-500">Absent</p>
        </div>
      </div>

      {/* Filters */}
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
              <option key={d.id} value={d.id}>{d.name}</option>
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
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Devices Section - Show if devices exist */}
      {devices.length > 0 && (
        <Card>
          <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Connected Devices</h2>
          <div className="flex flex-wrap gap-2">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center gap-2 rounded bg-gray-50 px-3 py-2 dark:bg-gray-800"
              >
                <div className={`h-2 w-2 rounded-full ${device.status === "ACTIVE" ? "bg-green-500" : "bg-gray-400"}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{device.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">({device.type})</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Records Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Department</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Check In</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Check Out</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Duration</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-2">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{record.userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{record.employeeId}</p>
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
                    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${getSourceBadge(record.source)}`}>
                      {record.source}
                    </span>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No attendance records for this date
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Device Setup Sidebar */}
      {showDeviceSetup && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowDeviceSetup(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl dark:bg-gray-900">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Add Attendance Device</h2>
                <button
                  onClick={() => setShowDeviceSetup(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    After adding a device, configure it to send attendance data to your API endpoint. The device will automatically sync check-in/check-out records.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 p-4 dark:border-gray-700">
                <Button onClick={handleSaveDevice} disabled={savingDevice} className="w-full">
                  {savingDevice ? "Adding..." : "Add Device"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
