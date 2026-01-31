"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

interface MobileConfig {
  baseUrl?: string;
  slug?: string;
  playStoreUrl?: string;
  appStoreUrl?: string;
}

interface OrgSettings {
  name?: string;
  logoUrl?: string;
  permissions?: {
    mobileConfig?: MobileConfig;
  };
}

export default function MobileAppPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/organization").then((r) => r.json()),
    ]).then(([meData, orgData]) => {
      if (!meData.success) {
        router.push("/login");
        return;
      }
      if (orgData.success) {
        setOrgSettings(orgData.data.settings);
      }
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
      </div>
    );
  }

  const mobileConfig = orgSettings?.permissions?.mobileConfig;
  const baseUrl = mobileConfig?.baseUrl || (typeof window !== "undefined" ? window.location.origin : "");

  const qrData = JSON.stringify({
    baseUrl: baseUrl,
    configUrl: `${baseUrl}/api/mobile-config`,
    logoUrl: orgSettings?.logoUrl || null,
    organizationName: orgSettings?.name || null,
    slug: mobileConfig?.slug || null,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Mobile App</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Scan to setup mobile app
        </p>
      </div>

      <div className="max-w-sm mx-auto text-center">
        {/* QR Code */}
        <div className="inline-block rounded-2xl bg-white p-6 shadow-sm">
          <QRCodeSVG
            value={qrData}
            size={200}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* Org Info */}
        <div className="mt-4">
          {orgSettings?.logoUrl && (
            <img
              src={orgSettings.logoUrl}
              alt=""
              className="mx-auto h-8 w-8 object-contain"
            />
          )}
          <p className="mt-2 font-medium text-gray-900 dark:text-white">
            {orgSettings?.name}
          </p>
        </div>

        {/* App Store Links */}
        {(mobileConfig?.playStoreUrl || mobileConfig?.appStoreUrl) && (
          <div className="mt-6 flex justify-center gap-3">
            {mobileConfig?.appStoreUrl && (
              <a
                href={mobileConfig.appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="text-sm font-medium">App Store</span>
              </a>
            )}
            {mobileConfig?.playStoreUrl && (
              <a
                href={mobileConfig.playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                </svg>
                <span className="text-sm font-medium">Play Store</span>
              </a>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-left">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
            How to setup
          </p>
          <ol className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex gap-2">
              <span className="text-gray-400">1.</span>
              Download the app
            </li>
            <li className="flex gap-2">
              <span className="text-gray-400">2.</span>
              Tap "Scan QR to Setup"
            </li>
            <li className="flex gap-2">
              <span className="text-gray-400">3.</span>
              Point camera at QR code
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
