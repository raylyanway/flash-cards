import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import Container from "@mui/material/Container";
import { useMemo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { NavBar } from "../components/NavBar";
import DialogsProvider from "../hooks/useDialogs/DialogsProvider";
import NotificationsProvider from "../hooks/useNotifications/NotificationsProvider";
import { AnalyticsScreen } from "../screens/AnalyticsScreen";
import { ContentScreen } from "../screens/ContentScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LearnScreen } from "../screens/LearnScreen";
import EmployeeCreate from "../screens/library/EmployeeCreate";
import EmployeeEdit from "../screens/library/EmployeeEdit";
import EmployeeList from "../screens/library/EmployeeList";
import EmployeeShow from "../screens/library/EmployeeShow";
import { LibraryScreen } from "../screens/library/LibraryScreen";
import { ProgressSetupScreen } from "../screens/ProgressSetupScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { useAppStore } from "../store/useAppStore";
import { createAppTheme } from "../theme";

export function App() {
  const themePreference = useAppStore((state) => state.theme);

  const mode = useMemo(() => {
    if (themePreference === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    return themePreference;
  }, [themePreference]);

  const appTheme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme />
      <NotificationsProvider>
        <DialogsProvider>
          <NavBar />
          <Container maxWidth="lg">
            <Box
              component="main"
              sx={{
                pt: { xs: 14, sm: 18 },
                pb: { xs: 8, sm: 12 },
              }}
            >
              <Routes>
                <Route path="/" element={<HomeScreen />} />
                <Route path="/learn" element={<LearnScreen />} />
                <Route path="/analytics" element={<AnalyticsScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
                <Route path="/content" element={<ContentScreen />} />
                <Route
                  path="/progress-setup"
                  element={<ProgressSetupScreen />}
                />
                <Route path="/library" element={<LibraryScreen />}>
                  <Route index element={<EmployeeList />} />
                  <Route path="employees" element={<EmployeeList />} />
                  <Route
                    path="employees/:employeeId"
                    element={<EmployeeShow />}
                  />
                  <Route path="employees/new" element={<EmployeeCreate />} />
                  <Route
                    path="employees/:employeeId/edit"
                    element={<EmployeeEdit />}
                  />
                  <Route path="*" element={<EmployeeList />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Box>
          </Container>
        </DialogsProvider>
      </NotificationsProvider>
    </ThemeProvider>
  );
}
