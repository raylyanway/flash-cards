import { ReactNode, useEffect, useState } from "react";
import { getSettingsFromDB } from "../cardData";
import { useFlashCardData } from "../hooks/useFlashCardData";
import { useAppStore } from "../store/useAppStore";
import type { ThemePreference } from "../types";
import { AppLoader } from "./AppLoader";

const DEFAULT_THEME: ThemePreference = "system";
const DEFAULT_SET = "body-parts";

type AppInitializerProps = {
  children: ReactNode;
};

export function AppInitializer({ children }: AppInitializerProps) {
  const [initializing, setInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<Error | null>(
    null,
  );

  const theme = useAppStore((state) => state.theme);
  const setCurrentSet = useAppStore((state) => state.setCurrentSet);
  const setTheme = useAppStore((state) => state.setTheme);
  const refreshCardsetOptions = useAppStore(
    (state) => state.refreshCardsetOptions,
  );

  const { loadSetData } = useFlashCardData();

  useEffect(() => {
    let mounted = true;

    async function boot() {
      setInitializationError(null);

      const settings = await getSettingsFromDB();
      if (!mounted) return;

      const savedSet = settings.currentSet || DEFAULT_SET;
      const savedTheme = settings.theme || DEFAULT_THEME;
      setCurrentSet(savedSet);
      setTheme(savedTheme);

      const cardsetOptions = await refreshCardsetOptions(savedSet);
      if (!mounted) return;

      const setToLoad = cardsetOptions.some((option) => option.key === savedSet)
        ? savedSet
        : cardsetOptions[0]?.key || DEFAULT_SET;
      await loadSetData(setToLoad);
      if (mounted) {
        setInitializing(false);
      }
    }

    boot().catch((error) => {
      console.error("Failed to initialize app:", error);
      if (mounted) {
        setInitializationError(error as Error);
        setInitializing(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [loadSetData, refreshCardsetOptions, setCurrentSet, setTheme]);

  useEffect(() => {
    document.body.classList.remove("theme-system", "theme-light", "theme-dark");
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  if (initializing) {
    return <AppLoader />;
  }

  if (initializationError) {
    return (
      <main className="screen active">
        <div className="card">
          <h1>Unable to load flash cards</h1>
          <p className="help-text">{initializationError.message}</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
