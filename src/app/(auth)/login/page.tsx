"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components";

interface OrgSettings {
  name?: string;
  logoUrl?: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);

  useEffect(() => {
    fetch("/api/organization")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setOrgSettings(data.data.settings);
          // Set page title
          if (data.data.settings.name) {
            document.title = `Login - ${data.data.settings.name}`;
          }
          // Set favicon to org logo (circular)
          if (data.data.settings.logoUrl) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const size = 64;
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.beginPath();
                ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(img, 0, 0, size, size);
                const link =
                  (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ||
                  document.createElement("link");
                link.rel = "icon";
                link.href = canvas.toDataURL("image/png");
                document.head.appendChild(link);
              }
            };
            img.onerror = () => {
              // Fallback to original if CORS fails
              const link =
                (document.querySelector("link[rel~='icon']") as HTMLLinkElement) ||
                document.createElement("link");
              link.rel = "icon";
              link.href = data.data.settings.logoUrl;
              document.head.appendChild(link);
            };
            img.src = data.data.settings.logoUrl;
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Left side - Branding */}
      <div className="hidden w-1/2 bg-gray-900 lg:flex lg:flex-col lg:justify-between p-12">
        <div>
          <div className="flex items-center gap-2.5">
            {orgSettings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Dynamic URL from org settings
              <img src={orgSettings.logoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                  />
                </svg>
              </div>
            )}
            <span className="text-base font-semibold text-white">
              {orgSettings?.name || "HRM System"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Manage your team
            <br />
            with confidence
          </h1>
          <p className="text-sm text-gray-400 max-w-md">
            Streamline HR operations, track employee data, and build a better workplace.
          </p>
        </div>

        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} {orgSettings?.name || "HRM System"}. All rights reserved.
        </p>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between p-6 lg:p-8">
          <div className="flex items-center gap-2 lg:hidden">
            {orgSettings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Dynamic URL from org settings
              <img src={orgSettings.logoUrl} alt="" className="h-7 w-7 rounded-md object-contain" />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600">
                <svg
                  className="h-5 w-5 text-white dark:text-gray-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
            )}
            <span className="font-semibold text-gray-900 dark:text-white">
              {orgSettings?.name || "HRM"}
            </span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 lg:px-16">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Welcome back</h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Enter your credentials to access your account
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2 rounded bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  className="mt-1.5 block w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-gray-100 dark:focus:ring-gray-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="block w-full rounded border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-gray-100 dark:focus:ring-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded bg-gray-900 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:focus:ring-offset-gray-950"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="mt-8 rounded border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Demo Credentials
              </p>
              <div className="mt-2 space-y-1 font-mono text-sm text-gray-700 dark:text-gray-300">
                <p>admin@company.com</p>
                <p>admin123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
