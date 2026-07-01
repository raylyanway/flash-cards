import { useAppStore } from "../store/useAppStore";
import { AppHeader } from "./appHeader";
import { IconButton } from "./iconButton";
import { Icons } from "./Icons";
import { ScreenSwitcher } from "./ScreenSwitcher";

export function AppContent() {
  const setScreen = useAppStore((state) => state.setScreen);

  return (
    <>
      <IconButton icon={Icons.home} ariaLabel="Home" />
      <AppHeader onOpenSettings={() => setScreen("settings")} />
      <ScreenSwitcher />
    </>
  );
}
