import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import Container from "@mui/material/Container";
import { useMemo } from "react";
import { NavBar } from "../components/NavBar";
import DialogsProvider from "../hooks/useDialogs/DialogsProvider";
import NotificationsProvider from "../hooks/useNotifications/NotificationsProvider";
import { useAppStore } from "../store/useAppStore";
import { createAppTheme } from "../theme";
import { ScreenSwitcher } from "./ScreenSwitcher";

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
              <ScreenSwitcher />
            </Box>
          </Container>
        </DialogsProvider>
      </NotificationsProvider>
    </ThemeProvider>
  );
}
