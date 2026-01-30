"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components";

export default function NewBranchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    phone: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to create branch");
        return;
      }

      router.push("/dashboard/branches");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Add Branch</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Create a new company branch</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="name" label="Branch Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input id="code" label="Code *" placeholder="e.g., HQ, BR01" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} required />
          </div>
          <Input id="address" label="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input id="city" label="City" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
            <Input id="state" label="State" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
            <Input id="country" label="Country" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="phone" label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input id="email" type="email" label="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Branch"}</Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
