"use client";

import { useCallback, useEffect, useState } from "react";
import { themeModeSchema, type ThemeMode } from "@/lib/schemas";

const STORAGE_KEY = "dao-theme";

/**
 * @description Resuelve el tema inicial desde localStorage o prefers-color-scheme.
 * @returns Modo claro u oscuro.
 */
function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const parsed = themeModeSchema.safeParse(stored);
  if (parsed.success) return parsed.data;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/**
 * @description Aplica el tema al documento y lo persiste.
 * @param theme Modo a aplicar.
 */
function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * @description Hook de tema claro/oscuro con persistencia.
 * @returns theme, setTheme, toggleTheme, ready.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = resolveInitialTheme();
    applyTheme(initial);
    setThemeState(initial);
    setReady(true);
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return { theme, toggleTheme, setTheme, ready };
}
