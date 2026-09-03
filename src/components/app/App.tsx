import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import { createAppTheme } from "../../theme";
import { NavBar } from "../navBar";
import { ScreenSwitcher } from "../ScreenSwitcher";

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
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <NavBar />
        <Box
          component="main"
          sx={{
            width: "min(1200px, calc(100% - 32px))",
            mx: "auto",
            py: { xs: 2, md: 4 },
            px: { xs: 0, sm: 0 },
          }}
        >
          <ScreenSwitcher />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
