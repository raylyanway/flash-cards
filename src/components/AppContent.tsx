import { useAppStore } from "../store/useAppStore";
import { AppHeader } from "./appHeader";
import { ScreenSwitcher } from "./ScreenSwitcher";

export function AppContent() {
  const setScreen = useAppStore((state) => state.setScreen);

  return (
    <>
      <AppHeader onOpenSettings={() => setScreen("settings")} />
      <ScreenSwitcher />
    </>
  );
}
