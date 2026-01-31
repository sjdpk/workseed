"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useTheme } from "next-themes";

interface OrgTheme {
  accentColor: string;
  darkMode: "system" | "light" | "dark";
}

interface OrgThemeContextType {
  theme: OrgTheme | null;
  loading: boolean;
}

const OrgThemeContext = createContext<OrgThemeContextType>({
  theme: null,
  loading: true,
});

export function useOrgTheme() {
  return useContext(OrgThemeContext);
}

export function OrgThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<OrgTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const { setTheme: setNextTheme } = useTheme();

  useEffect(() => {
    fetch("/api/organization")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.settings.theme) {
          const orgTheme = data.data.settings.theme as OrgTheme;
          setTheme(orgTheme);

          // Apply accent color to html element
          if (orgTheme.accentColor) {
            document.documentElement.setAttribute("data-accent", orgTheme.accentColor);
          }

          // Apply dark mode preference
          if (orgTheme.darkMode && orgTheme.darkMode !== "system") {
            setNextTheme(orgTheme.darkMode);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [setNextTheme]);

  return (
    <OrgThemeContext.Provider value={{ theme, loading }}>
      {children}
    </OrgThemeContext.Provider>
  );
}
