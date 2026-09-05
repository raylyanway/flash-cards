import { useAppStore } from "../store/useAppStore";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { ContentScreen } from "../screens/ContentScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LearnScreen } from "../screens/LearnScreen";
import { ProgressSetupScreen } from "../screens/ProgressSetupScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { LibraryScreen } from "../screens/LibraryScreen";

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

    case "content":
      return <ContentScreen />;

    case "progressSetup":
      return <ProgressSetupScreen />;

    case "library":
      return <LibraryScreen />;
  }
}
