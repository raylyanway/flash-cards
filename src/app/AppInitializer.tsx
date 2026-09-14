import { ReactNode, useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useAppStore } from "../store/useAppStore";
import { AppLoader } from "./AppLoader";

type AppInitializerProps = {
  children: ReactNode;
};

export function AppInitializer({ children }: AppInitializerProps) {
  const initialized = useAppStore((state) => state.initialized);
  const initialize = useAppStore((state) => state.initialize);
  const setNow = useAppStore((state) => state.setNow);
  const _hasHydrated = useAppStore((s) => s._hasHydrated);
  const startupAttempted = useRef(false);

  useEffect(() => {
    if (!_hasHydrated || initialized || startupAttempted.current) {
      return;
    }

    startupAttempted.current = true;
    void initialize().catch(() => {
      startupAttempted.current = false;
    });
  }, [initialize, initialized, _hasHydrated]);

  useTheme();

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [setNow]);

  if (!initialized) return <AppLoader />;

  return <>{children}</>;
}
