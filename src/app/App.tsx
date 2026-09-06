import { Box, CssBaseline, ThemeProvider } from "@mui/material";
import Container from "@mui/material/Container";
import { useMemo } from "react";
import { NavBar } from "../components/NavBar";
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
      <NavBar />
      <Container maxWidth="lg">
        <Box
          component="main"
          sx={{
            pt: { xs: 14, sm: 20 },
            pb: { xs: 8, sm: 12 },
          }}
        >
          <ScreenSwitcher />
        </Box>
      </Container>
    </ThemeProvider>
  );
}
