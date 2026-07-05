"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Dropdown, useToast, useConfirm } from "@/components";

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
  type: string[];
  deviceId: string;
  status: string;
  location?: string | null;
  syncMode?: string;
  protocol?: string;
  ipAddress?: string | null;
  port?: number;
  apiKey: string;
  lastSync: string | null;
}

// Live reachability of a device, distinct from its configured status.
type LiveStatus = "checking" | "online" | "offline" | "unknown";

interface DeviceUserRow {
  uid?: number;
  userId: string;
  name?: string;
  role?: number;
  cardno?: number;
  mapped: boolean;
  employee: { name: string; employeeId: string } | null;
}

interface DeviceLogRow {
  pin: string;
  time: string;
  state: number | null;
  employee: { name: string; employeeId: string } | null;
  // true = already imported into attendance, false = mapped but not yet synced,
  // null = PIN not linked to any employee (can't sync until linked).
  synced: boolean | null;
}

const SOURCES = [
  { value: "", label: "All Sources" },
  { value: "WEB", label: "Web" },
  { value: "MOBILE", label: "Mobile App" },
  { value: "BIOMETRIC", label: "Biometric" },
  { value: "RFID", label: "RFID" },
  { value: "MANUAL", label: "Manual" },
];

// Local YYYY-MM-DD (avoids the UTC shift that toISOString() introduces west of UTC).
const toDateStr = (d: Date) => {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split("T")[0];
};
const TODAY_STR = toDateStr(new Date());

// Quick date-range presets shown next to the From/To inputs.
const DATE_PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  { label: "Today", range: () => ({ from: TODAY_STR, to: TODAY_STR }) },
  {
    label: "Last 7 days",
    range: () => {
      const from = new Date();
      from.setDate(from.getDate() - 6);
      return { from: toDateStr(from), to: TODAY_STR };
    },
  },
  {
    label: "This month",
    range: () => {
      const from = new Date();
      from.setDate(1);
      return { from: toDateStr(from), to: TODAY_STR };
    },
  },
];

// A device can support several of these at once.
const DEVICE_CAPABILITIES = [
  { value: "BIOMETRIC", label: "Fingerprint" },
  { value: "FACE", label: "Face" },
  { value: "RFID", label: "RFID Card" },
];

// Popular reader protocols / brands. "other" reveals a free-text field.
const PROTOCOLS = [
  { value: "zkteco", label: "ZKTeco / eSSL (ZK Protocol)" },
  { value: "hikvision", label: "Hikvision" },
  { value: "suprema", label: "Suprema (BioStar)" },
  { value: "anviz", label: "Anviz" },
  { value: "realtime", label: "Realtime" },
  { value: "matrix", label: "Matrix (COSEC)" },
  { value: "dahua", label: "Dahua" },
  { value: "mantra", label: "Mantra" },
  { value: "secureye", label: "Secureye" },
];

// Protocol options including the custom escape hatch, for the dropdowns.
const PROTOCOL_OPTIONS = [...PROTOCOLS, { value: "other", label: "Other (custom)…" }];

const SYNC_MODE_OPTIONS = [
  { value: "LAN_DIRECT", label: "Same network — app pulls from device" },
  { value: "CLOUD_AGENT", label: "Cloud — on-prem agent pushes" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

export default function AttendanceManagePage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, present: 0, absent: 0 });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [userRole, setUserRole] = useState<string>("");

  // Filters
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(TODAY_STR);
  const [dateTo, setDateTo] = useState(TODAY_STR);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedDevice, setSelectedDevice] = useState(""); // device serial
  const [refreshing, setRefreshing] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const moreFiltersRef = useRef<HTMLDivElement>(null);

  // Device setup
  const [showDeviceSetup, setShowDeviceSetup] = useState(false);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [newDevice, setNewDevice] = useState({
    name: "",
    type: ["BIOMETRIC"] as string[],
    deviceId: "",
    syncMode: "LAN_DIRECT",
    protocol: "zkteco",
    ipAddress: "",
    port: "4370",
  });
  const [savingDevice, setSavingDevice] = useState(false);
  const [createdDevice, setCreatedDevice] = useState<{
    name: string;
    deviceId: string;
    apiKey: string;
    syncMode: string;
    protocol: string;
    ipAddress: string | null;
    port: number;
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

  const [recordsLoading, setRecordsLoading] = useState(false);
  const fetchRecords = useCallback(async () => {
    // Guard against an inverted range (From after To).
    const from = dateFrom <= dateTo ? dateFrom : dateTo;
    const to = dateFrom <= dateTo ? dateTo : dateFrom;
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    if (selectedDepartment) params.set("departmentId", selectedDepartment);
    if (selectedTeam) params.set("teamId", selectedTeam);
    if (selectedSource) params.set("source", selectedSource);
    if (selectedDevice) params.set("deviceId", selectedDevice);

    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/attendance/records?${params}`);
      const data = await res.json();
      if (data.success) {
        setRecords(data.data.records);
        setSummary(data.data.summary);
      }
    } finally {
      setRecordsLoading(false);
    }
  }, [dateFrom, dateTo, selectedDepartment, selectedTeam, selectedSource, selectedDevice]);

  useEffect(() => {
    if (loading) return;
    fetchRecords();
  }, [loading, fetchRecords]);

  // Manual refresh — re-fetch the current filtered view.
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchRecords();
    } finally {
      setRefreshing(false);
    }
  };

  const isRange = dateFrom !== dateTo;

  // Reset every filter back to defaults (today, all scopes).
  const clearFilters = () => {
    setSearch("");
    setDateFrom(TODAY_STR);
    setDateTo(TODAY_STR);
    setSelectedDepartment("");
    setSelectedTeam("");
    setSelectedSource("");
    setSelectedDevice("");
  };

  const hasActiveFilters =
    !!search ||
    !!selectedDepartment ||
    !!selectedTeam ||
    !!selectedSource ||
    !!selectedDevice ||
    dateFrom !== TODAY_STR ||
    dateTo !== TODAY_STR;

  // Count of the secondary filters tucked inside the "More filters" popover.
  const moreFiltersCount =
    (selectedDepartment ? 1 : 0) +
    (selectedTeam ? 1 : 0) +
    (selectedSource ? 1 : 0) +
    (selectedDevice ? 1 : 0);

  // Close the "More filters" popover on outside-click / Escape.
  useEffect(() => {
    if (!showMoreFilters) return;
    const onDocClick = (e: MouseEvent) => {
      if (moreFiltersRef.current && !moreFiltersRef.current.contains(e.target as Node)) {
        setShowMoreFilters(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMoreFilters(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [showMoreFilters]);

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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });

  // Filter records by search (client-side), memoized so typing doesn't re-scan
  // on unrelated re-renders.
  const filteredRecords = useMemo(() => {
    if (!search) return records;
    const searchLower = search.toLowerCase();
    return records.filter(
      (record) =>
        record.userName.toLowerCase().includes(searchLower) ||
        record.employeeId.toLowerCase().includes(searchLower) ||
        record.department?.toLowerCase().includes(searchLower) ||
        record.team?.toLowerCase().includes(searchLower)
    );
  }, [records, search]);

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
      formatDate(r.date),
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
    link.setAttribute(
      "download",
      isRange ? `attendance-${dateFrom}_to_${dateTo}.csv` : `attendance-${dateFrom}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported successfully");
  };

  const [syncing, setSyncing] = useState(false);
  const handleSyncDevices = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/attendance/sync", { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Sync failed");
        return;
      }
      const results: { device: string; daysWritten: number; error?: string }[] =
        data.data?.results ?? [];
      if (results.length === 0) {
        toast.success("No LAN-direct devices to sync");
      } else {
        const errs = results.filter((r) => r.error);
        const ok = results.filter((r) => !r.error);
        const days = ok.reduce((n, r) => n + r.daysWritten, 0);

        // Only claim success for devices that actually synced; never show a
        // green "synced" toast when every device failed.
        if (ok.length > 0) {
          toast.success(`Synced ${ok.length} device(s), ${days} days written`);
        } else {
          toast.error(`Sync failed for all ${results.length} device(s)`);
        }
        errs.forEach((r) => toast.error(`${r.device}: ${r.error}`));
      }
      fetchRecords();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Live reachability per device id — drives the status dot (green/red/amber),
  // independent of the device's configured ACTIVE/INACTIVE status.
  const [liveStatus, setLiveStatus] = useState<Record<string, LiveStatus>>({});

  const probeStatus = async (device: Device) => {
    if ((device.syncMode ?? "LAN_DIRECT") === "CLOUD_AGENT" || !device.ipAddress) {
      setLiveStatus((s) => ({ ...s, [device.id]: "unknown" }));
      return;
    }
    setLiveStatus((s) => ({ ...s, [device.id]: "checking" }));
    try {
      const res = await fetch("/api/attendance/devices/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: device.id }),
      });
      const data = await res.json();
      setLiveStatus((s) => ({
        ...s,
        [device.id]: data.success && data.data?.reachable ? "online" : "offline",
      }));
    } catch {
      setLiveStatus((s) => ({ ...s, [device.id]: "offline" }));
    }
  };

  // Auto-check reachability whenever the device list opens.
  useEffect(() => {
    if (showDeviceList) devices.forEach((d) => probeStatus(d));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeviceList]);

  const dotClass = (device: Device) => {
    switch (liveStatus[device.id]) {
      case "online":
        return "bg-green-500";
      case "offline":
        return "bg-red-500";
      case "checking":
        return "bg-amber-400 animate-pulse";
      default:
        // Not probed (cloud / no IP): fall back to the configured status.
        return device.status === "ACTIVE" ? "bg-gray-300 dark:bg-gray-600" : "bg-gray-400";
    }
  };

  const dotTitle = (device: Device) => {
    switch (liveStatus[device.id]) {
      case "online":
        return "Online — reachable";
      case "offline":
        return "Offline — not reachable";
      case "checking":
        return "Checking…";
      default:
        return `Status: ${device.status}`;
    }
  };

  // Test connection — `testingKey` is the device id (saved device) or a
  // sentinel ("__new__" / "__edit__") so only the clicked button shows a spinner.
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const runTest = async (
    payload: { id?: string; ipAddress?: string; port?: string | number; protocol?: string },
    key: string
  ) => {
    setTestingKey(key);
    toast.info("Connecting to the device…");
    try {
      const res = await fetch("/api/attendance/devices/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const r = data.data;
      const reachable = data.success && r?.reachable;
      if (payload.id) {
        setLiveStatus((s) => ({ ...s, [payload.id as string]: reachable ? "online" : "offline" }));
      }
      if (reachable) {
        const bits: string[] = [];
        if (typeof r.latencyMs === "number") bits.push(`${r.latencyMs} ms`);
        if (r.info?.users != null) bits.push(`${r.info.users} users`);
        if (r.info?.logs != null) bits.push(`${r.info.logs} logs`);
        toast.success(`Connected${bits.length ? ` — ${bits.join(", ")}` : ""}`);
      } else {
        toast.error(r?.error || data.error || "Could not connect to the device");
      }
    } catch {
      toast.error("Could not connect to the device");
    } finally {
      setTestingKey(null);
    }
  };

  // Device inspector — live view of enrolled users / punch logs on a device.
  const [inspect, setInspect] = useState<{ id: string; name: string } | null>(null);
  const [inspectTab, setInspectTab] = useState<"users" | "logs">("users");
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [inspectUsers, setInspectUsers] = useState<DeviceUserRow[] | null>(null);
  const [inspectUsersMeta, setInspectUsersMeta] = useState<{ total: number; mapped: number } | null>(null);
  const [inspectLogs, setInspectLogs] = useState<DeviceLogRow[] | null>(null);
  const [inspectLogsMeta, setInspectLogsMeta] = useState<{ totalOnDevice: number; returned: number; unsynced: number } | null>(null);
  const [logsUnsyncedOnly, setLogsUnsyncedOnly] = useState(false);

  const loadInspector = async (id: string, tab: "users" | "logs") => {
    setInspectLoading(true);
    setInspectError(null);
    try {
      const res = await fetch(`/api/attendance/devices/${id}/${tab}`);
      const data = await res.json();
      if (!data.success) {
        setInspectError(data.error || "Failed to load");
        return;
      }
      if (tab === "users") {
        setInspectUsers(data.data.users);
        setInspectUsersMeta({ total: data.data.total, mapped: data.data.mapped });
      } else {
        setInspectLogs(data.data.logs);
        setInspectLogsMeta({
          totalOnDevice: data.data.totalOnDevice,
          returned: data.data.returned,
          unsynced: data.data.unsynced ?? 0,
        });
      }
    } catch {
      setInspectError("Failed to reach the server");
    } finally {
      setInspectLoading(false);
    }
  };

  const openInspector = (device: Device, tab: "users" | "logs") => {
    setShowDeviceList(false); // close the sidebar so the inline inspector is visible
    setInspect({ id: device.id, name: device.name });
    setInspectTab(tab);
    setSelectedPins(new Set());
    setInspectUsers(null);
    setInspectUsersMeta(null);
    setInspectLogs(null);
    setInspectLogsMeta(null);
    setLogsUnsyncedOnly(false);
    setInspectError(null);
    loadInspector(device.id, tab);
  };

  const switchInspectTab = (tab: "users" | "logs") => {
    setInspectTab(tab);
    if (!inspect) return;
    if (tab === "users" && inspectUsers === null) loadInspector(inspect.id, "users");
    if (tab === "logs" && inspectLogs === null) loadInspector(inspect.id, "logs");
  };

  // Selection for importing specific device users.
  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());
  const unmappedPins = (inspectUsers ?? []).filter((u) => !u.mapped).map((u) => u.userId);
  const allUnmappedSelected =
    unmappedPins.length > 0 && unmappedPins.every((p) => selectedPins.has(p));
  const togglePin = (pin: string) =>
    setSelectedPins((s) => {
      const next = new Set(s);
      if (next.has(pin)) next.delete(pin);
      else next.add(pin);
      return next;
    });
  const toggleAllUnmapped = () =>
    setSelectedPins(allUnmappedSelected ? new Set() : new Set(unmappedPins));

  // Link an existing employee to a device PIN (no duplicate).
  const [linkPin, setLinkPin] = useState<string | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkCandidates, setLinkCandidates] = useState<
    { id: string; name: string; employeeId: string }[] | null
  >(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  const fetchLinkCandidates = async (search: string) => {
    setLinkLoading(true);
    try {
      const res = await fetch(
        `/api/attendance/unlinked-users?search=${encodeURIComponent(search)}`
      );
      const data = await res.json();
      setLinkCandidates(data.success ? data.data.users : []);
    } catch {
      setLinkCandidates([]);
    } finally {
      setLinkLoading(false);
    }
  };

  const openLink = (pin: string) => {
    setLinkPin(pin);
    setLinkSearch("");
    setLinkCandidates(null);
    fetchLinkCandidates("");
  };

  const doLink = async (userId: string) => {
    if (!linkPin || !inspect) return;
    setLinking(true);
    try {
      const res = await fetch("/api/attendance/link-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, deviceUserId: linkPin }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Could not link employee");
        return;
      }
      toast.success(`Linked ${data.data.user.name} to PIN ${linkPin}`);
      setLinkPin(null);
      await loadInspector(inspect.id, "users");
    } catch {
      toast.error("Could not link employee");
    } finally {
      setLinking(false);
    }
  };

  // Import device users as employees (PIN pre-linked). `pins` omitted = all unmapped.
  const [importing, setImporting] = useState(false);
  const importDeviceUsers = async (pins?: string[]) => {
    if (!inspect) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/attendance/devices/${inspect.id}/import-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pins ? { pins } : {}),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Import failed");
        return;
      }
      const d = data.data;
      const extra = [
        d.skipped ? `${d.skipped} already existed` : "",
        d.failed ? `${d.failed} failed` : "",
      ]
        .filter(Boolean)
        .join(", ");
      toast.success(`Imported ${d.created} employee(s)${extra ? ` — ${extra}` : ""}`);
      setSelectedPins(new Set());
      await loadInspector(inspect.id, "users"); // refresh mapping badges
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  };

  // Backfill — import ALL historical punches from one device (ignores watermark).
  const [backfillingId, setBackfillingId] = useState<string | null>(null);
  const handleBackfill = async (device: Device) => {
    const ok = await confirm({
      title: `Import all past punches from "${device.name}"?`,
      message:
        "This reads every log on the device and creates attendance for mapped employees. Safe to run, but may take a moment on a busy device.",
      confirmText: "Import",
    });
    if (!ok) return;
    setBackfillingId(device.id);
    try {
      const res = await fetch(`/api/attendance/devices/${device.id}/backfill`, { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.data?.error || data.error || "Backfill failed");
        return;
      }
      const r = data.data;
      const extra = r.unmatched?.length ? `, ${r.unmatched.length} unmatched PIN(s)` : "";
      toast.success(`Backfill done — ${r.matched} matched, ${r.daysWritten} day(s) written${extra}`);
      setDevices((ds) =>
        ds.map((d) => (d.id === device.id ? { ...d, lastSync: new Date().toISOString() } : d))
      );
      fetchRecords();
    } catch {
      toast.error("Backfill failed");
    } finally {
      setBackfillingId(null);
    }
  };

  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const handleUpdateDevice = async () => {
    if (!editDevice) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/attendance/devices/${editDevice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDevice.name,
          type: editDevice.type,
          location: editDevice.location,
          status: editDevice.status,
          syncMode: editDevice.syncMode,
          protocol: editDevice.protocol,
          ipAddress: editDevice.ipAddress,
          port: editDevice.port,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || "Failed to update device");
        return;
      }
      setDevices(devices.map((d) => (d.id === editDevice.id ? { ...d, ...data.data.device } : d)));
      toast.success("Device updated");
      setEditDevice(null);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveDevice = async () => {
    if (!newDevice.name || !newDevice.deviceId || newDevice.type.length === 0) {
      toast.error("Name, device ID, and at least one type are required");
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
        syncMode: data.data.device.syncMode,
        protocol: data.data.device.protocol,
        ipAddress: data.data.device.ipAddress,
        port: data.data.device.port,
      });
      setNewDevice({
        name: "",
        type: ["BIOMETRIC"] as string[],
        deviceId: "",
        syncMode: "LAN_DIRECT",
        protocol: "zkteco",
        ipAddress: "",
        port: "4370",
      });
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
      {!inspect && (
        <>
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded bg-gray-50 p-4 dark:bg-gray-800">
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{summary.total}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Employees</p>
        </div>
        <div className="rounded bg-green-50 p-4 dark:bg-green-900/20">
          <p className="text-2xl font-semibold text-green-700 dark:text-green-400">
            {summary.present}
          </p>
          <p className="text-xs text-green-600 dark:text-green-500">
            {isRange ? "Present (in range)" : "Present"}
          </p>
        </div>
        <div className="rounded bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-2xl font-semibold text-red-700 dark:text-red-400">{summary.absent}</p>
          <p className="text-xs text-red-600 dark:text-red-500">
            {isRange ? "Never present (in range)" : "Absent"}
          </p>
        </div>
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
            placeholder="Search employee..."
            className="w-full rounded border border-gray-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* Date range: From → To */}
        <div className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-800">
          <input
            type="date"
            value={dateFrom}
            max={dateTo || TODAY_STR}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="bg-transparent text-sm text-gray-900 focus:outline-none dark:text-white"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            max={TODAY_STR}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="bg-transparent text-sm text-gray-900 focus:outline-none dark:text-white"
          />
        </div>

        {/* Quick range presets */}
        <div className="flex items-center gap-1">
          {DATE_PRESETS.map((p) => {
            const r = p.range();
            const active = dateFrom === r.from && dateTo === r.to;
            return (
              <button
                key={p.label}
                onClick={() => {
                  setDateFrom(r.from);
                  setDateTo(r.to);
                }}
                className={`rounded px-2 py-1 text-xs transition-colors ${
                  active
                    ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* More filters — secondary filters tucked into a popover */}
        <div className="relative" ref={moreFiltersRef}>
          <button
            onClick={() => setShowMoreFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm transition-colors ${
              moreFiltersCount > 0
                ? "border-gray-900 text-gray-900 dark:border-white dark:text-white"
                : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
              />
            </svg>
            More filters
            {moreFiltersCount > 0 && (
              <span className="ml-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-semibold text-white dark:bg-white dark:text-gray-900">
                {moreFiltersCount}
              </span>
            )}
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform ${showMoreFilters ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showMoreFilters && (
            <div className="absolute left-0 z-40 mt-2 w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-gray-700 dark:bg-gray-800">
              <div className="space-y-3">
                {(userRole === "ADMIN" || userRole === "HR") && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Department
                    </label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(userRole === "ADMIN" || userRole === "HR" || userRole === "MANAGER") && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Team
                    </label>
                    <select
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      className="w-full rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="">All Teams</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Source
                  </label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {devices.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                      Device
                    </label>
                    <select
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      className="w-full rounded border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="">All Devices</option>
                      {devices.map((d) => (
                        <option key={d.id} value={d.deviceId}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh records"
          className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <svg
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>

        <button
          onClick={exportCSV}
          disabled={records.length === 0}
          className="flex items-center gap-1.5 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <DownloadIcon />
          Export CSV
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Records Table */}
      <Card>
        <div className="mb-2 flex items-center justify-between px-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {filteredRecords.length} record{filteredRecords.length === 1 ? "" : "s"}
            {isRange && (
              <span className="ml-1 text-gray-400">
                · {formatDate(dateFrom)} – {formatDate(dateTo)}
              </span>
            )}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                {isRange && (
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Date
                  </th>
                )}
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
              {recordsLoading && filteredRecords.length === 0
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      {Array.from({ length: isRange ? 7 : 6 }).map((__, j) => (
                        <td key={j} className="px-3 py-3">
                          <div className="h-3 w-full max-w-[120px] animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      {isRange && (
                        <td className="whitespace-nowrap px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(record.date)}
                        </td>
                      )}
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
                        {record.team && <span className="ml-1 text-xs">/ {record.team}</span>}
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
              {!recordsLoading && filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={isRange ? 7 : 6} className="px-3 py-12">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                        <svg
                          className="h-6 w-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.8}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                          />
                        </svg>
                      </div>
                      <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {search
                          ? "No employees match your search"
                          : hasActiveFilters
                            ? "No attendance records for these filters"
                            : "No attendance records for this date"}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearFilters}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
        </>
      )}

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
                    onClick={handleSyncDevices}
                    disabled={syncing}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50 flex items-center gap-1"
                    title="Pull attendance from LAN-direct devices now"
                  >
                    {syncing ? "Syncing…" : "Sync now"}
                  </button>
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
                        <span
                          className={`h-2 w-2 rounded-full ${dotClass(device)}`}
                          title={dotTitle(device)}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {device.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                      {(device.syncMode ?? "LAN_DIRECT") !== "CLOUD_AGENT" && (
                        <button
                          onClick={() => {
                            if (!device.ipAddress) {
                              toast.error("Add the device's IP address first (edit the device).");
                              return;
                            }
                            runTest({ id: device.id }, device.id);
                          }}
                          disabled={testingKey === device.id}
                          className="text-gray-400 hover:text-green-500 dark:hover:text-green-400 transition-colors p-1 disabled:opacity-50"
                          title="Test connection"
                        >
                          {testingKey === device.id ? (
                            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <SignalIcon />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setEditDevice({ ...device })}
                        className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors p-1"
                        title="Edit device"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: `Delete device "${device.name}"?`,
                            message: "This action cannot be undone.",
                            confirmText: "Delete",
                            variant: "danger",
                          });
                          if (!ok) return;
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
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Type</span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {(device.type ?? []).join(", ")}
                        </span>
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

                    {(device.syncMode ?? "LAN_DIRECT") !== "CLOUD_AGENT" && (
                      <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openInspector(device, "users")}
                            className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            View users
                          </button>
                          <button
                            onClick={() => openInspector(device, "logs")}
                            className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          >
                            View logs
                          </button>
                        </div>
                        <button
                          onClick={() => handleBackfill(device)}
                          disabled={backfillingId === device.id}
                          title="Import every past punch on the device (ignores the last-sync watermark)"
                          className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          {backfillingId === device.id
                            ? "Importing history…"
                            : "Backfill history (import all past punches)"}
                        </button>
                      </div>
                    )}
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

      {/* Device Inspector — inline master/detail view (replaces the list) */}
      {inspect && (
        <div className="animate-fade-in">
          <div className="flex flex-col overflow-hidden rounded-md border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setInspect(null)}
                  className="flex items-center gap-1.5 rounded border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {inspect.name}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Live view from the device — nothing is saved.
                  </p>
                </div>
              </div>
              <button
                onClick={() => loadInspector(inspect.id, inspectTab)}
                disabled={inspectLoading}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
              >
                {inspectLoading ? "Loading…" : "Refresh"}
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 px-6 dark:border-gray-700">
              {(["users", "logs"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => switchInspectTab(tab)}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                    inspectTab === tab
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  }`}
                >
                  {tab === "users" ? "Enrolled Users" : "Punch Logs"}
                </button>
              ))}
            </div>

            <div className="px-6 py-5">
              {inspectLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
                </div>
              ) : inspectError ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {inspectError}
                </div>
              ) : inspectTab === "users" ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    {inspectUsersMeta ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {inspectUsersMeta.total} enrolled · {inspectUsersMeta.mapped} mapped ·{" "}
                        {inspectUsersMeta.total - inspectUsersMeta.mapped} unmapped
                      </p>
                    ) : (
                      <span />
                    )}
                    {unmappedPins.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          importDeviceUsers(selectedPins.size ? [...selectedPins] : undefined)
                        }
                        disabled={importing}
                      >
                        {importing
                          ? "Importing…"
                          : selectedPins.size
                            ? `Import selected (${selectedPins.size})`
                            : `Import all unmapped (${unmappedPins.length})`}
                      </Button>
                    )}
                  </div>
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <tr>
                        <th className="w-8 px-2 py-2">
                          <input
                            type="checkbox"
                            aria-label="Select all unmapped"
                            checked={allUnmappedSelected}
                            disabled={unmappedPins.length === 0}
                            onChange={toggleAllUnmapped}
                            className="h-4 w-4 rounded border-gray-300 disabled:opacity-40"
                          />
                        </th>
                        <th className="px-2 py-2">PIN</th>
                        <th className="px-2 py-2">Name (on device)</th>
                        <th className="px-2 py-2">Card</th>
                        <th className="px-2 py-2">Mapped employee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(inspectUsers ?? []).map((u) => (
                        <tr key={`${u.uid}-${u.userId}`}>
                          <td className="px-2 py-2">
                            {!u.mapped && (
                              <input
                                type="checkbox"
                                aria-label={`Select ${u.userId}`}
                                checked={selectedPins.has(u.userId)}
                                onChange={() => togglePin(u.userId)}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            )}
                          </td>
                          <td className="px-2 py-2 font-mono text-gray-900 dark:text-white">
                            {u.userId}
                          </td>
                          <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                            {u.name || "—"}
                          </td>
                          <td className="px-2 py-2 text-gray-500 dark:text-gray-400">
                            {u.cardno ?? "—"}
                          </td>
                          <td className="px-2 py-2">
                            {u.employee ? (
                              <span className="text-gray-700 dark:text-gray-300">
                                {u.employee.name}{" "}
                                <span className="text-xs text-gray-400">
                                  ({u.employee.employeeId})
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <span className="inline-flex rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                  Unmapped
                                </span>
                                <button
                                  onClick={() => importDeviceUsers([u.userId])}
                                  disabled={importing}
                                  className="text-xs text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
                                >
                                  Import
                                </button>
                                <span className="text-gray-300 dark:text-gray-600">|</span>
                                <button
                                  onClick={() => openLink(u.userId)}
                                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                                >
                                  Link existing
                                </button>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(inspectUsers ?? []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No users enrolled on this device
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-gray-400">
                    <span className="font-medium">Import</span> creates an employee with this PIN
                    pre-linked (name from the device; edit details later). Already have the person?
                    Instead set their <span className="font-medium">Device User ID</span> to this PIN
                    on their profile. Either way, their punches then sync into attendance.
                  </p>
                </>
              ) : (
                <>
                  {inspectLogsMeta && (
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Showing {inspectLogsMeta.returned} most recent of{" "}
                        {inspectLogsMeta.totalOnDevice} logs on the device
                        {inspectLogsMeta.unsynced > 0 && (
                          <span className="ml-1 font-medium text-amber-600 dark:text-amber-400">
                            · {inspectLogsMeta.unsynced} not yet in attendance
                          </span>
                        )}
                      </p>
                      <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={logsUnsyncedOnly}
                          onChange={(e) => setLogsUnsyncedOnly(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600"
                        />
                        Unsynced only
                      </label>
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-gray-700 dark:text-gray-400">
                      <tr>
                        <th className="px-2 py-2">Time</th>
                        <th className="px-2 py-2">PIN</th>
                        <th className="px-2 py-2">Employee</th>
                        <th className="px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {(inspectLogs ?? [])
                        .filter((l) => !logsUnsyncedOnly || l.synced === false)
                        .map((l, i) => (
                          <tr key={`${l.pin}-${l.time}-${i}`}>
                            <td className="px-2 py-2 text-gray-900 dark:text-white">
                              {new Date(l.time).toLocaleString()}
                            </td>
                            <td className="px-2 py-2 font-mono text-gray-700 dark:text-gray-300">
                              {l.pin}
                            </td>
                            <td className="px-2 py-2">
                              {l.employee ? (
                                <span className="text-gray-700 dark:text-gray-300">
                                  {l.employee.name}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">unmatched PIN</span>
                              )}
                            </td>
                            <td className="px-2 py-2">
                              {l.synced === true ? (
                                <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                                  Synced
                                </span>
                              ) : l.synced === false ? (
                                <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                                  Not synced
                                </span>
                              ) : (
                                <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                  Unlinked
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      {(inspectLogs ?? []).filter((l) => !logsUnsyncedOnly || l.synced === false)
                        .length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            {logsUnsyncedOnly
                              ? "No unsynced punches — everything is imported"
                              : "No punch logs on this device"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Link-to-existing-employee picker (layers above the inspector) */}
      {linkPin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLinkPin(null)} />
          <div className="relative flex max-h-[70vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Link PIN {linkPin} to an employee
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pick someone already in the system — no duplicate is created.
                </p>
              </div>
              <button
                onClick={() => setLinkPin(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="border-b border-gray-200 p-3 dark:border-gray-700">
              <input
                type="text"
                autoFocus
                value={linkSearch}
                onChange={(e) => {
                  setLinkSearch(e.target.value);
                  fetchLinkCandidates(e.target.value);
                }}
                placeholder="Search name or employee ID…"
                className="w-full rounded border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {linkLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
                </div>
              ) : (linkCandidates ?? []).length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {linkSearch
                    ? "No unlinked employees match."
                    : "No unlinked employees — everyone active is already linked to a device."}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(linkCandidates ?? []).map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-2 py-2">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.employeeId}</p>
                      </div>
                      <button
                        onClick={() => doLink(c.id)}
                        disabled={linking}
                        className="rounded border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        {linking ? "Linking…" : "Link"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {editDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditDevice(null)} />
          <div className="relative w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Edit Device — {editDevice.deviceId}
              </h2>
              <button
                onClick={() => setEditDevice(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={editDevice.name}
                  onChange={(e) => setEditDevice({ ...editDevice, name: e.target.value })}
                  className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Device Type{" "}
                  <span className="text-xs font-normal text-gray-400">(select all it supports)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEVICE_CAPABILITIES.map((cap) => {
                    const list = editDevice.type ?? [];
                    const active = list.includes(cap.value);
                    return (
                      <button
                        type="button"
                        key={cap.value}
                        onClick={() =>
                          setEditDevice({
                            ...editDevice,
                            type: active ? list.filter((t) => t !== cap.value) : [...list, cap.value],
                          })
                        }
                        className={`rounded border px-3 py-1 text-sm transition-colors ${
                          active
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {active ? "✓ " : ""}
                        {cap.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <Dropdown
                  options={STATUS_OPTIONS}
                  value={editDevice.status}
                  onChange={(v) => setEditDevice({ ...editDevice, status: v })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sync Mode</label>
                <Dropdown
                  options={SYNC_MODE_OPTIONS}
                  value={editDevice.syncMode ?? "LAN_DIRECT"}
                  onChange={(v) => setEditDevice({ ...editDevice, syncMode: v })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Protocol</label>
                <Dropdown
                  options={PROTOCOL_OPTIONS}
                  value={
                    PROTOCOLS.some((p) => p.value === (editDevice.protocol ?? "zkteco"))
                      ? editDevice.protocol ?? "zkteco"
                      : "other"
                  }
                  onChange={(v) => setEditDevice({ ...editDevice, protocol: v === "other" ? "" : v })}
                />
                {!PROTOCOLS.some((p) => p.value === (editDevice.protocol ?? "zkteco")) && (
                  <input
                    type="text"
                    value={editDevice.protocol ?? ""}
                    onChange={(e) => setEditDevice({ ...editDevice, protocol: e.target.value })}
                    placeholder="custom protocol id"
                    className="mt-2 w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IP Address</label>
                  <input
                    type="text"
                    value={editDevice.ipAddress ?? ""}
                    onChange={(e) => setEditDevice({ ...editDevice, ipAddress: e.target.value })}
                    placeholder="192.168.1.50"
                    className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                  <input
                    type="text"
                    value={editDevice.port ?? 4370}
                    onChange={(e) => setEditDevice({ ...editDevice, port: Number(e.target.value) || 4370 })}
                    className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
              {(editDevice.syncMode ?? "LAN_DIRECT") !== "CLOUD_AGENT" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!editDevice.ipAddress) {
                      toast.error("Enter an IP address to test.");
                      return;
                    }
                    runTest(
                      {
                        ipAddress: editDevice.ipAddress,
                        port: editDevice.port,
                        protocol: editDevice.protocol,
                      },
                      "__edit__"
                    );
                  }}
                  disabled={testingKey === "__edit__"}
                >
                  {testingKey === "__edit__" ? "Testing…" : "Test connection"}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditDevice(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateDevice} disabled={savingEdit}>
                  {savingEdit ? "Saving…" : "Save"}
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

                    {/* API Key — only relevant for push (cloud) mode */}
                    {createdDevice.syncMode !== "LAN_DIRECT" && (
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
                    )}

                    {createdDevice.syncMode === "LAN_DIRECT" ? (
                      /* LAN-direct: the app pulls from the device — no device webhook */
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Setup — this app pulls from the device
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          No webhook on the device. The app connects to it over your local
                          network and reads punch logs.
                          {createdDevice.protocol !== "zkteco" &&
                            " Note: automatic LAN pull is built for ZK Protocol only — for this brand use Cloud (push) mode."}
                        </p>

                        <div className="rounded bg-gray-50 p-3 dark:bg-gray-800 space-y-1">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            1. On the device — give it a fixed IP
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Menu → Comm / Network → Ethernet → set IP address, subnet, gateway. Note the IP.
                          </p>
                        </div>

                        <div className="rounded bg-gray-50 p-3 dark:bg-gray-800 space-y-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            2. This server must reach the device at
                          </p>
                          <code className="block text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">
                            {createdDevice.ipAddress || "<device IP>"}:{createdDevice.port}
                          </code>
                          {!createdDevice.ipAddress && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              No IP set yet — edit the device and add its IP address.
                            </p>
                          )}
                        </div>

                        <div className="rounded bg-gray-50 p-3 dark:bg-gray-800 space-y-1">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            3. Pull attendance
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Open the device list and click “Sync now”. (You can also schedule it.)
                          </p>
                        </div>

                        <div className="rounded bg-gray-50 p-3 dark:bg-gray-800 space-y-1">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            4. Match employees
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Set each person’s device enrollment number as their “Device User ID”
                            on their employee profile.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Cloud / push: an agent or integration pushes to the API */
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                          Setup — push attendance into this app
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          This app can’t reach the device directly. Run a small agent on a machine
                          on the device’s network: it reads punches and POSTs them here using the
                          API key above. (Attendance hardware does not call webhooks on its own.)
                        </p>

                        <div className="rounded bg-gray-50 p-3 dark:bg-gray-800 space-y-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Endpoint (batch)
                          </p>
                          <code className="block text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                            POST {typeof window !== "undefined" ? window.location.origin : ""}
                            /api/attendance/ingest
                          </code>
                          <code className="block text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">
                            X-API-Key: {createdDevice.apiKey.slice(0, 8)}...
                          </code>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                            {`{ "punches": [
  { "pin": "1001", "time": "2026-06-28T09:00:00Z" }
] }`}
                          </pre>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            pin = the person’s Device User ID. The server aggregates and dedupes.
                          </p>
                        </div>

                        <div className="rounded bg-gray-50 p-3 dark:bg-gray-800 space-y-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Single check-in/out (custom integrations)
                          </p>
                          <code className="block text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded break-all">
                            POST {typeof window !== "undefined" ? window.location.origin : ""}
                            /api/attendance/webhook
                          </code>
                          <pre className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                            {`{ "deviceUserId": "1001", "action": "IN" }`}
                          </pre>
                        </div>
                      </div>
                    )}

                    {createdDevice.syncMode !== "LAN_DIRECT" && (
                      <div className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                        <p className="text-xs text-amber-800 dark:text-amber-400">
                          <strong>Important:</strong> Save the API key now — it&apos;s shown only once.
                        </p>
                      </div>
                    )}
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
                        Device Type{" "}
                        <span className="text-xs font-normal text-gray-400">(select all it supports)</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DEVICE_CAPABILITIES.map((cap) => {
                          const active = newDevice.type.includes(cap.value);
                          return (
                            <button
                              type="button"
                              key={cap.value}
                              onClick={() =>
                                setNewDevice({
                                  ...newDevice,
                                  type: active
                                    ? newDevice.type.filter((t) => t !== cap.value)
                                    : [...newDevice.type, cap.value],
                                })
                              }
                              className={`rounded border px-3 py-1 text-sm transition-colors ${
                                active
                                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300"
                              }`}
                            >
                              {active ? "✓ " : ""}
                              {cap.label}
                            </button>
                          );
                        })}
                      </div>
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sync Mode
                      </label>
                      <Dropdown
                        options={SYNC_MODE_OPTIONS}
                        value={newDevice.syncMode}
                        onChange={(v) => setNewDevice({ ...newDevice, syncMode: v })}
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {newDevice.syncMode === "CLOUD_AGENT"
                          ? "Run the agent on a machine on the device's network; it pushes punches to this app."
                          : "This app reaches the device directly over the local network."}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Protocol
                      </label>
                      <Dropdown
                        options={PROTOCOL_OPTIONS}
                        value={PROTOCOLS.some((p) => p.value === newDevice.protocol) ? newDevice.protocol : "other"}
                        onChange={(v) => setNewDevice({ ...newDevice, protocol: v === "other" ? "" : v })}
                      />
                      {!PROTOCOLS.some((p) => p.value === newDevice.protocol) && (
                        <input
                          type="text"
                          value={newDevice.protocol}
                          onChange={(e) => setNewDevice({ ...newDevice, protocol: e.target.value })}
                          placeholder="custom protocol id (e.g. hikvision-isapi)"
                          className="mt-2 w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Only ZK Protocol auto-pulls over LAN today; others can still push via the API.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Device IP Address
                        </label>
                        <input
                          type="text"
                          value={newDevice.ipAddress}
                          onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
                          placeholder="e.g., 192.168.1.50"
                          className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Port
                        </label>
                        <input
                          type="text"
                          value={newDevice.port}
                          onChange={(e) => setNewDevice({ ...newDevice, port: e.target.value })}
                          placeholder="4370"
                          className="w-full rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        />
                      </div>
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
                  <div className="flex gap-2">
                    {newDevice.syncMode !== "CLOUD_AGENT" && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!newDevice.ipAddress.trim()) {
                            toast.error("Enter the device IP address to test.");
                            return;
                          }
                          runTest(
                            {
                              ipAddress: newDevice.ipAddress,
                              port: newDevice.port,
                              protocol: newDevice.protocol,
                            },
                            "__new__"
                          );
                        }}
                        disabled={testingKey === "__new__"}
                      >
                        {testingKey === "__new__" ? "Testing…" : "Test"}
                      </Button>
                    )}
                    <Button
                      onClick={handleSaveDevice}
                      disabled={savingDevice}
                      className="flex-1"
                    >
                      {savingDevice ? "Adding..." : "Add Device"}
                    </Button>
                  </div>
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

function SignalIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "h-4 w-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
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
