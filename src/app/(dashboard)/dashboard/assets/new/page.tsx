"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, useToast } from "@/components";

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

const CONDITION_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "EXCELLENT", label: "Excellent" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "POOR", label: "Poor" },
];

export default function NewAssetPage() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "LAPTOP",
    brand: "",
    model: "",
    serialNumber: "",
    description: "",
    purchaseDate: "",
    purchasePrice: "",
    warrantyExpiry: "",
    condition: "NEW",
    location: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        serialNumber: formData.serialNumber || undefined,
        description: formData.description || undefined,
        purchaseDate: formData.purchaseDate || undefined,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        warrantyExpiry: formData.warrantyExpiry || undefined,
        condition: formData.condition,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
      };

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to create asset");
        return;
      }

      toast.success("Asset created successfully");
      router.push(`/dashboard/assets/${data.asset.id}`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Asset</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Register a new company asset
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            Basic Information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                id="name"
                label="Asset Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., MacBook Pro 14"
                required
              />
            </div>
            <Select
              id="category"
              label="Category *"
              options={CATEGORY_OPTIONS}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
              placeholder="e.g., Apple"
            />
            <Input
              id="model"
              label="Model"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g., A2442"
            />
            <Input
              id="serialNumber"
              label="Serial Number"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              placeholder="e.g., C02XG0BKJGH7"
            />
            <Input
              id="location"
              label="Storage Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., IT Room, Shelf A"
            />
          </div>
          <div className="mt-4">
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about the asset..."
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-gray-100"
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
              placeholder="0.00"
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
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
            Notes
          </h2>
          <textarea
            id="notes"
            rows={4}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Internal notes about this asset..."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-gray-100"
          />
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Asset"}
          </Button>
        </div>
      </form>
    </div>
  );
}
