import { Navigate, useLocation } from "react-router-dom";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { ContentScreen } from "../screens/ContentScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LearnScreen } from "../screens/LearnScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { ProgressSetupScreen } from "../screens/ProgressSetupScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

export function ScreenSwitcher() {
  const { pathname } = useLocation();

  if (pathname === "/") return <HomeScreen />;
  if (pathname === "/learn") return <LearnScreen />;
  if (pathname === "/analytics") return <AnalyticsScreen />;
  if (pathname === "/settings") return <SettingsScreen />;
  if (pathname === "/content") return <ContentScreen />;
  if (pathname === "/progress-setup") return <ProgressSetupScreen />;
  if (pathname.startsWith("/library")) return <LibraryScreen />;

  return <Navigate to="/" replace />;
}
