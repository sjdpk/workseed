"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Button, Card, Input, useToast } from "@/components";

const ALLOWED_ROLES = ["ADMIN", "HR"];

export default function MobileSetupPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [formData, setFormData] = useState({
    baseUrl: "",
    slug: "",
    playStoreUrl: "",
    appStoreUrl: "",
  });

  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFormData((prev) => ({
        ...prev,
        baseUrl: prev.baseUrl || window.location.origin,
      }));
    }

    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
    ]).then(([meData, orgData]) => {
      if (meData.success && !ALLOWED_ROLES.includes(meData.data.user.role)) {
        router.replace("/dashboard");
        return;
      }
      if (orgData.success) {
        const settings = orgData.data.settings;
        setOrgName(settings.name || "");
        setLogoUrl(settings.logoUrl || "");

        const mobileConfig = settings.permissions?.mobileConfig || {};

        if (mobileConfig.baseUrl) {
          setFormData({
            baseUrl: mobileConfig.baseUrl,
            slug: mobileConfig.slug || "",
            playStoreUrl: mobileConfig.playStoreUrl || "",
            appStoreUrl: mobileConfig.appStoreUrl || "",
          });
          setShowQR(true);
        }
      }
      setLoading(false);
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const orgRes = await fetch("/api/organization");
      const orgData = await orgRes.json();
      const currentPermissions = orgData.data?.settings?.permissions || {};

      const res = await fetch("/api/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permissions: {
            ...currentPermissions,
            mobileConfig: {
              ...currentPermissions.mobileConfig,
              baseUrl: formData.baseUrl,
              slug: formData.slug || undefined,
              playStoreUrl: formData.playStoreUrl || undefined,
              appStoreUrl: formData.appStoreUrl || undefined,
            },
          },
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to save");
        return;
      }

      toast.success("Saved");
      setShowQR(true);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const getQRData = () => {
    return JSON.stringify({
      baseUrl: formData.baseUrl,
      configUrl: `${formData.baseUrl}/api/mobile-config`,
      logoUrl: logoUrl || null,
      organizationName: orgName,
      slug: formData.slug || null,
    });
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
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Mobile App Setup</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure mobile app settings
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="space-y-4">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">Configuration</h2>

            <Input
              id="baseUrl"
              label="Base URL *"
              type="url"
              placeholder="https://your-domain.com"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
              required
            />

            <Input
              id="slug"
              label="Organization Slug"
              placeholder="my-company"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
          </Card>

          <Card className="space-y-4">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white">App Store Links</h2>

            <Input
              id="appStoreUrl"
              label="App Store URL (iOS)"
              type="url"
              placeholder="https://apps.apple.com/app/..."
              value={formData.appStoreUrl}
              onChange={(e) => setFormData({ ...formData, appStoreUrl: e.target.value })}
            />

            <Input
              id="playStoreUrl"
              label="Play Store URL (Android)"
              type="url"
              placeholder="https://play.google.com/store/apps/..."
              value={formData.playStoreUrl}
              onChange={(e) => setFormData({ ...formData, playStoreUrl: e.target.value })}
            />
          </Card>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </form>

        <div>
          {showQR && formData.baseUrl ? (
            <div className="text-center">
              <div className="inline-block rounded-2xl bg-white p-6 shadow-sm">
                <QRCodeSVG
                  value={getQRData()}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                {orgName}
              </p>
              <p className="mt-1 text-xs text-gray-500 break-all">
                {formData.baseUrl}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Save to generate QR code
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
