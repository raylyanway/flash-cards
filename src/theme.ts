import { createTheme } from "@mui/material/styles";

export function createAppTheme(mode: "light" | "dark") {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: "#4f46e5",
        light: "#818cf8",
        dark: "#312e81",
      },
      secondary: {
        main: "#0f172a",
      },
      background: {
        default: mode === "light" ? "#f5f7fb" : "#0b1020",
        paper: mode === "light" ? "#ffffff" : "#121a2b",
      },
      success: {
        main: "#16a34a",
      },
      warning: {
        main: "#f59e0b",
      },
      error: {
        main: "#ef4444",
      },
      text: {
        primary: mode === "light" ? "#0f172a" : "#e2e8f0",
        secondary: mode === "light" ? "#475569" : "#94a3b8",
      },
    },
    shape: {
      borderRadius: 18,
    },
    typography: {
      fontFamily: '"Inter", "Noto Sans", sans-serif',
      h1: { fontWeight: 700, letterSpacing: -0.04 },
      h2: { fontWeight: 700, letterSpacing: -0.03 },
      h3: { fontWeight: 700, letterSpacing: -0.02 },
      button: { textTransform: "none", fontWeight: 600 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: "none",
            paddingInline: 18,
            minHeight: 44,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            border: "1px solid rgba(148, 163, 184, 0.18)",
            backgroundImage: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 18,
            border: "1px solid rgba(148, 163, 184, 0.18)",
            backgroundImage: "none",
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
          },
        },
      },
    },
  });
}
