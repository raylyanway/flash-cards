import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import type { ThemePreference } from "../types";

export function useTheme() {
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const activeTheme = theme === "system" ? getSystemTheme() : theme;
    applyTheme(activeTheme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      applyTheme(getSystemTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);
}

function getSystemTheme(): Exclude<ThemePreference, "system"> {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Exclude<ThemePreference, "system">) {
  // Keeps native browser UI (scrollbars, form controls) in sync with the
  // MUI theme mode, which is applied separately via ThemeProvider in App.tsx.
  document.documentElement.style.colorScheme = theme;
}
