"use client";

import React, { createContext, useContext, useEffect, useCallback, useState } from "react";
import { useSupabase, type QueryResult } from "@/lib/supabase";
import type { ThemeSettings } from "@/types";
import { defaultTheme } from "@/types";
import { defaultFooterJson } from "@/lib/footer-settings";

type ThemeContextType = { theme: ThemeSettings; setTheme: (t: Partial<ThemeSettings>) => void };

const ThemeContext = createContext<ThemeContextType>(null!);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSettings>(defaultTheme);
  const supabase = useSupabase();

  // Load saved theme from DB
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("theme_settings")
      .select("*")
      .limit(1)
      .single()
      .then((res: QueryResult<ThemeSettings>) => {
        if (res.data) {
          setThemeState((t) => {
            const next = { ...t, ...res.data! };
            if (next.home_sections_json == null || next.home_sections_json === "")
              next.home_sections_json = defaultTheme.home_sections_json;
            return next;
          });
        }
      })
      .catch(() => {});
  }, [supabase]);

  // Listen for live theme pushes from the admin theme editor (postMessage)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type !== "BB_THEME_UPDATE") return;
      const incoming = e.data.theme as Partial<ThemeSettings>;
      if (!incoming || typeof incoming !== "object") return;
      setThemeState((t) => {
        const next = { ...t, ...incoming };
        if (next.home_sections_json == null || next.home_sections_json === "")
          next.home_sections_json = defaultTheme.home_sections_json;
        if (next.footer_json == null || String(next.footer_json).trim() === "")
          next.footer_json = defaultFooterJson();
        return next;
      });
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const setTheme = useCallback((patch: Partial<ThemeSettings>) => {
    setThemeState((t) => ({ ...t, ...patch }));
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
