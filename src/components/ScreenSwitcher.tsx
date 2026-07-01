import { useAppStore } from "../store/useAppStore";
import { AnalyticsScreen } from "./AnalyticsScreen";
import { CardSetScreen } from "./CardSetScreen";
import { HomeScreen } from "./homeScreen";
import { LearnScreen } from "./LearnScreen";
import { ProgressSetupScreen } from "./ProgressSetupScreen";
import { SettingsScreen } from "./SettingsScreen";

export function ScreenSwitcher() {
  const screen = useAppStore((state) => state.screen);

  switch (screen) {
    case "home":
      return <HomeScreen />;

    case "learn":
      return <LearnScreen />;

    case "analytics":
      return <AnalyticsScreen />;

    case "settings":
      return <SettingsScreen />;

    case "cardSet":
      return <CardSetScreen />;

    case "progressSetup":
      return <ProgressSetupScreen />;
  }
}
