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
          backgroundImage:
            "linear-gradient(180deg, rgba(8,127,140,0.055) 0, transparent 250px)",
        }}
      >
        <NavBar />
        <Box
          component="main"
          sx={{
            width: "min(1160px, calc(100% - 40px))",
            mx: "auto",
            py: { xs: 3, md: 5 },
            px: { xs: 0, sm: 0 },
          }}
        >
          <ScreenSwitcher />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
