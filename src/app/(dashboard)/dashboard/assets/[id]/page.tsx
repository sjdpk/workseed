"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { Button, Card, Input, Select, useToast } from "@/components";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department?: { name: string };
}

interface Assignment {
  id: string;
  assignedAt: string;
  returnedAt?: string;
  condition: string;
  returnCondition?: string;
  notes?: string;
  returnNotes?: string;
  user: User;
}

interface Asset {
  id: string;
  assetTag: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiry?: string;
  status: string;
  condition: string;
  location?: string;
  notes?: string;
  specifications?: Record<string, unknown>;
  assignedTo?: User;
  assignedAt?: string;
  assignments: Assignment[];
}

const CATEGORY_OPTIONS = [
  { value: "LAPTOP", label: "Laptop" },
  { value: "DESKTOP", label: "Desktop" },
  { value: "MOBILE", label: "Mobile" },
  { value: "TABLET", label: "Tablet" },
  { value: "MONITOR", label: "Monitor" },
  { value: "KEYBOARD", label: "Keyboard" },
  { value: "MOUSE", label: "Mouse" },
  { value: "HEADSET", label: "Headset" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "ID_CARD", label: "ID Card" },
  { value: "ACCESS_CARD", label: "Access Card" },
  { value: "SOFTWARE_LICENSE", label: "Software License" },
  { value: "OTHER", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "RETIRED", label: "Retired" },
  { value: "LOST", label: "Lost" },
  { value: "DAMAGED", label: "Damaged" },
];

const CONDITION_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
];

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  ASSIGNED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  MAINTENANCE: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  RETIRED: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  LOST: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  DAMAGED: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    brand: "",
    model: "",
    serialNumber: "",
    description: "",
    purchaseDate: "",
    purchasePrice: "",
    warrantyExpiry: "",
    status: "",
    condition: "",
    location: "",
    notes: "",
  });

  const [assignData, setAssignData] = useState({
    userId: "",
    notes: "",
  });

  const [returnData, setReturnData] = useState({
    returnCondition: "GOOD",
    returnNotes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/assets/${id}`).then((r) => r.json()),
      fetch("/api/users?limit=200").then((r) => r.json()),
    ]).then(([assetData, usersData]) => {
      if (assetData.success && assetData.data?.asset) {
        const a = assetData.data.asset;
        setAsset(a);
        setFormData({
          name: a.name || "",
          category: a.category || "",
          brand: a.brand || "",
          model: a.model || "",
          serialNumber: a.serialNumber || "",
          description: a.description || "",
          purchaseDate: a.purchaseDate ? a.purchaseDate.split("T")[0] : "",
          purchasePrice: a.purchasePrice?.toString() || "",
          warrantyExpiry: a.warrantyExpiry ? a.warrantyExpiry.split("T")[0] : "",
          status: a.status || "",
          condition: a.condition || "",
          location: a.location || "",
          notes: a.notes || "",
        });
      }
      if (usersData.success) {
        setUsers(usersData.data.users);
      }
      setLoading(false);
    });
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        brand: formData.brand || null,
        model: formData.model || null,
        serialNumber: formData.serialNumber || null,
        description: formData.description || null,
        purchaseDate: formData.purchaseDate || null,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
        warrantyExpiry: formData.warrantyExpiry || null,
        status: formData.status,
        condition: formData.condition,
        location: formData.location || null,
        notes: formData.notes || null,
      };

      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to update asset");
        return;
      }

      setAsset(data.data.asset);
      setEditMode(false);
      toast.success("Asset updated successfully");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/assets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: id,
          userId: assignData.userId,
          notes: assignData.notes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to assign asset");
        return;
      }

      // Refresh asset data
      const assetRes = await fetch(`/api/assets/${id}`);
      const assetData = await assetRes.json();
      if (assetData.success && assetData.data?.asset) {
        setAsset(assetData.data.asset);
        setFormData((prev) => ({ ...prev, status: assetData.data.asset.status }));
      }

      setShowAssignModal(false);
      setAssignData({ userId: "", notes: "" });
      toast.success("Asset assigned successfully");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/assets/assign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: id,
          returnCondition: returnData.returnCondition,
          returnNotes: returnData.returnNotes || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to return asset");
        return;
      }

      // Refresh asset data
      const assetRes = await fetch(`/api/assets/${id}`);
      const assetData = await assetRes.json();
      if (assetData.success && assetData.data?.asset) {
        setAsset(assetData.data.asset);
        setFormData((prev) => ({
          ...prev,
          status: assetData.data.asset.status,
          condition: assetData.data.asset.condition,
        }));
      }

      setShowReturnModal(false);
      setReturnData({ returnCondition: "GOOD", returnNotes: "" });
      toast.success("Asset returned successfully");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete asset");
        return;
      }

      toast.success("Asset deleted successfully");
      router.push("/dashboard/assets");
    } catch {
      toast.error("Something went wrong");
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  if (!asset) {
    return <div className="p-8 text-center text-gray-500">Asset not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{asset.name}</h1>
            <span
              className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                STATUS_COLORS[asset.status] || ""
              }`}
            >
              {asset.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {asset.assetTag}
            {asset.serialNumber && ` • S/N: ${asset.serialNumber}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Back
          </Button>
          {!editMode && <Button onClick={() => setEditMode(true)}>Edit</Button>}
        </div>
      </div>

      {/* Current Assignment */}
      {asset.assignedTo && (
        <Card className="border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-900 dark:bg-gray-700 dark:text-white">
                {asset.assignedTo.firstName[0]}
                {asset.assignedTo.lastName[0]}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {asset.assignedTo.firstName} {asset.assignedTo.lastName}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {asset.assignedTo.employeeId} • {asset.assignedTo.email}
                </p>
                {asset.assignedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Assigned on {formatDate(asset.assignedAt)}
                  </p>
                )}
              </div>
            </div>
            <Button onClick={() => setShowReturnModal(true)}>Return Asset</Button>
          </div>
        </Card>
      )}

      {/* Assign Button for Available Assets */}
      {asset.status === "AVAILABLE" && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-green-700 dark:text-green-400">
              This asset is available for assignment.
            </p>
            <Button onClick={() => setShowAssignModal(true)}>Assign to User</Button>
          </div>
        </Card>
      )}

      {/* Edit Form or Details View */}
      {editMode ? (
        <form onSubmit={handleUpdate} className="space-y-6">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Basic Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="name"
                label="Asset Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Select
                id="category"
                label="Category *"
                options={CATEGORY_OPTIONS}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              />
              <Select
                id="status"
                label="Status *"
                options={STATUS_OPTIONS}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={asset.status === "ASSIGNED"}
              />
              <Select
                id="condition"
                label="Condition *"
                options={CONDITION_OPTIONS}
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              />
              <Input
                id="brand"
                label="Brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
              <Input
                id="model"
                label="Model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
              <Input
                id="serialNumber"
                label="Serial Number"
                value={formData.serialNumber}
                onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              />
              <Input
                id="location"
                label="Storage Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Purchase & Warranty
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                id="purchaseDate"
                type="date"
                label="Purchase Date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              />
              <Input
                id="purchasePrice"
                type="number"
                label="Purchase Price"
                value={formData.purchasePrice}
                onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                min="0"
                step="0.01"
              />
              <Input
                id="warrantyExpiry"
                type="date"
                label="Warranty Expiry"
                value={formData.warrantyExpiry}
                onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
              />
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Notes</h2>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" type="button" onClick={handleDelete} className="text-red-600">
              Delete Asset
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" type="button" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Details View */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Asset Details
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Category</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {asset.category.replace(/_/g, " ")}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Condition</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {asset.condition}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Brand / Model</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {asset.brand || "-"} {asset.model}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Serial Number</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {asset.serialNumber || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Storage Location</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {asset.location || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Purchase Date</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(asset.purchaseDate)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Purchase Price</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                  {asset.purchasePrice ? `$${asset.purchasePrice.toFixed(2)}` : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Warranty Expiry</dt>
                <dd
                  className={`mt-1 text-sm font-medium ${
                    asset.warrantyExpiry && new Date(asset.warrantyExpiry) < new Date()
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-900 dark:text-white"
                  }`}
                >
                  {formatDate(asset.warrantyExpiry)}
                </dd>
              </div>
            </dl>
            {asset.description && (
              <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Description</dt>
                <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {asset.description}
                </dd>
              </div>
            )}
            {asset.notes && (
              <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                <dt className="text-sm text-gray-500 dark:text-gray-400">Notes</dt>
                <dd className="mt-1 text-sm text-gray-700 dark:text-gray-300">{asset.notes}</dd>
              </div>
            )}
          </Card>

          {/* Assignment History */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
              Assignment History
            </h2>
            {asset.assignments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No assignment history yet.</p>
            ) : (
              <div className="space-y-4">
                {asset.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-start gap-3 border-l-2 border-gray-200 pl-4 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {assignment.user.firstName} {assignment.user.lastName}
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          ({assignment.user.employeeId})
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Assigned: {formatDateTime(assignment.assignedAt)}
                        {assignment.returnedAt && (
                          <> • Returned: {formatDateTime(assignment.returnedAt)}</>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Condition: {assignment.condition}
                        {assignment.returnCondition && <> → {assignment.returnCondition}</>}
                      </p>
                      {assignment.notes && (
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          Note: {assignment.notes}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs ${
                        assignment.returnedAt
                          ? "text-gray-500 dark:text-gray-400"
                          : "text-gray-900 dark:text-white"
                      }`}
                    >
                      {assignment.returnedAt ? "Returned" : "Active"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Assign Sidebar */}
      <div className={`fixed inset-0 z-50 ${showAssignModal ? "visible" : "invisible"}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            showAssignModal ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setShowAssignModal(false)}
        />
        {/* Sidebar */}
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-md transform bg-white shadow-xl transition-transform duration-300 dark:bg-gray-900 ${
            showAssignModal ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Assign Asset
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {asset?.assetTag} • {asset?.name}
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleAssign} className="flex flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-4">
                  <Select
                    id="userId"
                    label="Select User *"
                    options={[
                      { value: "", label: "Select a user" },
                      ...users.map((u) => ({
                        value: u.id,
                        label: `${u.firstName} ${u.lastName} (${u.employeeId})`,
                      })),
                    ]}
                    value={assignData.userId}
                    onChange={(e) => setAssignData({ ...assignData, userId: e.target.value })}
                    required
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Assignment Notes
                    </label>
                    <textarea
                      rows={4}
                      value={assignData.notes}
                      onChange={(e) => setAssignData({ ...assignData, notes: e.target.value })}
                      placeholder="Optional notes about this assignment..."
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-white"
                    />
                  </div>

                  {/* Asset Summary */}
                  <div className="rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Asset Summary
                    </h3>
                    <dl className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Category</dt>
                        <dd className="text-gray-900 dark:text-white">
                          {asset?.category.replace(/_/g, " ")}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Condition</dt>
                        <dd className="text-gray-900 dark:text-white">{asset?.condition}</dd>
                      </div>
                      {asset?.serialNumber && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500 dark:text-gray-400">Serial No.</dt>
                          <dd className="text-gray-900 dark:text-white">{asset.serialNumber}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving || !assignData.userId} className="flex-1">
                    {saving ? "Assigning..." : "Assign Asset"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Return Sidebar */}
      <div className={`fixed inset-0 z-50 ${showReturnModal ? "visible" : "invisible"}`}>
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${
            showReturnModal ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setShowReturnModal(false)}
        />
        {/* Sidebar */}
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-md transform bg-white shadow-xl transition-transform duration-300 dark:bg-gray-900 ${
            showReturnModal ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Return Asset
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {asset?.assetTag} • {asset?.name}
                </p>
              </div>
              <button
                onClick={() => setShowReturnModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleReturn} className="flex flex-1 flex-col">
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-4">
                  {/* Current Assignee Info */}
                  {asset?.assignedTo && (
                    <div className="rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                      <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                        Currently Assigned To
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {asset.assignedTo.firstName[0]}
                          {asset.assignedTo.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {asset.assignedTo.firstName} {asset.assignedTo.lastName}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {asset.assignedTo.employeeId}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Select
                    id="returnCondition"
                    label="Condition on Return *"
                    options={CONDITION_OPTIONS}
                    value={returnData.returnCondition}
                    onChange={(e) =>
                      setReturnData({ ...returnData, returnCondition: e.target.value })
                    }
                  />
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Return Notes
                    </label>
                    <textarea
                      rows={4}
                      value={returnData.returnNotes}
                      onChange={(e) =>
                        setReturnData({ ...returnData, returnNotes: e.target.value })
                      }
                      placeholder="Any notes about the condition or return..."
                      className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-gray-100"
                    />
                  </div>

                  {/* Condition Guide */}
                  <div className="rounded border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <h3 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Condition Guide
                    </h3>
                    <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <li>
                        <span className="font-medium text-green-600">New:</span> Unused, original
                        packaging
                      </li>
                      <li>
                        <span className="font-medium text-gray-600">Excellent:</span> Like new, no
                        visible wear
                      </li>
                      <li>
                        <span className="font-medium text-cyan-600">Good:</span> Minor wear, fully
                        functional
                      </li>
                      <li>
                        <span className="font-medium text-yellow-600">Fair:</span> Visible wear,
                        functional
                      </li>
                      <li>
                        <span className="font-medium text-red-600">Poor:</span> Heavy wear, may need
                        repair
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowReturnModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="flex-1">
                    {saving ? "Processing..." : "Confirm Return"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
