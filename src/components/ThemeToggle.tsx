"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- Intentional: SSR hydration pattern */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!mounted) {
    return <div className="h-8 w-24" />;
  }

  return (
    <div className="flex items-center gap-0.5 rounded border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-800">
      <button
        onClick={() => setTheme("light")}
        className={`rounded-sm px-2 py-1 text-xs font-medium transition-all ${
          theme === "light"
            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
        aria-label="Light mode"
      >
        Light
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`rounded-sm px-2 py-1 text-xs font-medium transition-all ${
          theme === "dark"
            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
        aria-label="Dark mode"
      >
        Dark
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`rounded-sm px-2 py-1 text-xs font-medium transition-all ${
          theme === "system"
            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        }`}
        aria-label="System preference"
      >
        Auto
      </button>
    </div>
  );
}
