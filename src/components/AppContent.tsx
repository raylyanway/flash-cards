import { AppHeader } from "./AppHeader";
import { HomeScreen } from "./HomeScreen";
import { LearnScreen } from "./LearnScreen";
import { AnalyticsScreen } from "./AnalyticsScreen";
import { ProgressSetupScreen } from "./ProgressSetupScreen";
import { SettingsScreen } from "./SettingsScreen";
import { useAppStore } from "../store/useAppStore";

export function AppContent() {
  const screen = useAppStore((state) => state.screen);
  const setScreen = useAppStore((state) => state.setScreen);

  return (
    <>
      <AppHeader onOpenSettings={() => setScreen("settings")} />

      {screen === "home" && <HomeScreen />}
      {screen === "learn" && <LearnScreen />}
      {screen === "analytics" && <AnalyticsScreen />}
      {screen === "settings" && <SettingsScreen />}
      {screen === "progressSetup" && <ProgressSetupScreen />}
    </>
  );
}
