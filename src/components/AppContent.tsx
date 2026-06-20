import { useAppStore } from "../store/useAppStore";
import { AnalyticsScreen } from "./AnalyticsScreen";
import { AppHeader } from "./AppHeader";
import { CardSetScreen } from "./CardSetScreen";
import { HomeScreen } from "./HomeScreen";
import { LearnScreen } from "./LearnScreen";
import { ProgressSetupScreen } from "./ProgressSetupScreen";
import { SettingsScreen } from "./SettingsScreen";

export function AppContent() {
  const screen = useAppStore((state) => state.screen);
  const setScreen = useAppStore((state) => state.setScreen);

  return (
    <>
      <AppHeader onOpenSettings={() => setScreen("settings")} />

      {screen === "home" && <HomeScreen />}
      {screen === "cardSet" && <CardSetScreen />}
      {screen === "learn" && <LearnScreen />}
      {screen === "analytics" && <AnalyticsScreen />}
      {screen === "settings" && <SettingsScreen />}
      {screen === "progressSetup" && <ProgressSetupScreen />}
    </>
  );
}
