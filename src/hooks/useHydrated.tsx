import { useEffect, useState } from "react";
import { useAppStore } from "../store/useAppStore";

export function useHydrated(timeoutMs = 5000) {
  const isHydrated = useAppStore((s) => s.isHydrated);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    if (isHydrated) setReady(true);

    const t = setTimeout(() => {
      if (mounted && !isHydrated) setReady(true); // fallback to avoid indefinite blocking
    }, timeoutMs);

    return () => {
      mounted = false;
      clearTimeout(t);
    };
  }, [isHydrated, timeoutMs]);

  return ready;
}

export default useHydrated;
