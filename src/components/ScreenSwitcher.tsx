import { useAppStore } from "../store/useAppStore";
import { AnalyticsScreen } from "./AnalyticsScreen";
import { ContentScreen } from "./contentScreen";
import { HomeScreen } from "./homeScreen";
import { LearnScreen } from "./LearnScreen";
import { ProgressSetupScreen } from "./ProgressSetupScreen";
import { SettingsScreen } from "./SettingsScreen";
import { LibraryScreen } from "./libraryScreen";

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
