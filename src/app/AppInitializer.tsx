import { ReactNode, useEffect, useRef, useState } from "react";
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
  const [minimumLoaderElapsed, setMinimumLoaderElapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumLoaderElapsed(true), 900);
    return () => window.clearTimeout(timer);
  }, []);

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

  if (!initialized || !minimumLoaderElapsed) return <AppLoader />;

  return <>{children}</>;
}
