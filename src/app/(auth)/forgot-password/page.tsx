"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components";

interface OrgSettings {
  name?: string;
  logoUrl?: string | null;
}

function DefaultLogo({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: { container: "h-8 w-8", text: "text-xs" },
    md: { container: "h-10 w-10", text: "text-sm" },
    lg: { container: "h-12 w-12", text: "text-base" },
  };
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`${sizes[size].container} flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25`}
    >
      <span className={`${sizes[size].text} font-bold text-white`}>{initials || "HR"}</span>
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgSettings, setOrgSettings] = useState<OrgSettings | null>(null);

  useEffect(() => {
    fetch("/api/organization/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setOrgSettings(data.data.settings);
          if (data.data.settings.name) {
            document.title = `Forgot Password - ${data.data.settings.name}`;
          }
        }
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Something went wrong");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const orgName = orgSettings?.name || "HRM System";

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Left side - Branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 lg:flex lg:flex-col lg:justify-between p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute top-1/4 right-1/4 h-64 w-64 rounded-full bg-blue-500/5 blur-2xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            {orgSettings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgSettings.logoUrl}
                alt=""
                className="h-10 w-10 rounded-xl object-contain shadow-lg"
              />
            ) : (
              <DefaultLogo name={orgName} size="md" />
            )}
            <span className="text-lg font-semibold text-white">{orgName}</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Reset your
            <br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              password
            </span>
          </h1>
          <p className="text-base text-gray-400 max-w-md leading-relaxed">
            No worries, it happens to the best of us. Enter your email and we&apos;ll send you a
            link to reset your password.
          </p>
        </div>

        <p className="relative text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {orgName}. All rights reserved.
        </p>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full flex-col lg:w-1/2">
        <div className="flex items-center justify-between p-6 lg:p-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            {orgSettings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgSettings.logoUrl}
                alt=""
                className="h-8 w-8 rounded-xl object-contain shadow-md"
              />
            ) : (
              <DefaultLogo name={orgName} size="sm" />
            )}
            <span className="font-semibold text-gray-900 dark:text-white">{orgName}</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-12 lg:px-16">
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Forgot your password?
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            {success ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3 rounded bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                  <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    If an account exists with this email, you will receive a password reset link
                    shortly.
                  </span>
                </div>
                <Link
                  href="/login"
                  className="flex w-full items-center justify-center gap-2 rounded bg-gray-900 px-4 py-2 font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                  Back to login
                </Link>
              </div>
            ) : (
              <>
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
                        Sending...
                      </>
                    ) : (
                      "Send reset link"
                    )}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                  Remember your password?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
