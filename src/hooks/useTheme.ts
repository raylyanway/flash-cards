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
  document.body.classList.remove("theme-light", "theme-dark");
  document.body.classList.add(`theme-${theme}`);
  document.documentElement.style.colorScheme = theme;
}
