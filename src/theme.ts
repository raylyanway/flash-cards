import { createTheme } from "@mui/material/styles";

export function createAppTheme(mode: "light" | "dark") {
  const isLight = mode === "light";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? "#087f8c" : "#48c6c8",
        light: isLight ? "#36aeb4" : "#8ce2de",
        dark: isLight ? "#075e68" : "#1a8d94",
      },
      secondary: {
        main: isLight ? "#ef8354" : "#ff9d73",
      },
      background: {
        default: isLight ? "#f6f7f2" : "#101c21",
        paper: isLight ? "#fffefa" : "#17282d",
      },
      success: {
        main: isLight ? "#23856b" : "#62c99e",
      },
      warning: {
        main: isLight ? "#c87827" : "#f3b45d",
      },
      error: {
        main: isLight ? "#c65348" : "#f08378",
      },
      text: {
        primary: isLight ? "#18343a" : "#eff8f5",
        secondary: isLight ? "#607477" : "#adc4c2",
      },
    },
    shape: {
      borderRadius: 10,
    },
    typography: {
      fontFamily: '"DM Sans", "Noto Sans", sans-serif',
      h1: { fontWeight: 800, letterSpacing: "-0.04em" },
      h2: { fontWeight: 800, letterSpacing: "-0.035em" },
      h3: { fontWeight: 800, letterSpacing: "-0.03em" },
      h4: { fontWeight: 800, letterSpacing: "-0.025em" },
      h5: { fontWeight: 750, letterSpacing: "-0.02em" },
      h6: { fontWeight: 750, letterSpacing: "-0.015em" },
      button: {
        textTransform: "none",
        fontWeight: 750,
        letterSpacing: "0.01em",
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          "*, *::before, *::after": {
            borderColor: isLight ? "#dce6e2" : "#2c4649",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: "none",
            paddingInline: 17,
            minHeight: 42,
            "&:hover": { boxShadow: "none" },
          },
          containedPrimary: {
            color: "#fffefa",
            "&:hover": { backgroundColor: isLight ? "#075e68" : "#2dabb0" },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: isLight ? "1px solid #dce6e2" : "1px solid #2c4649",
            backgroundImage: "none",
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: isLight ? "1px solid #dce6e2" : "1px solid #2c4649",
            backgroundImage: "none",
            boxShadow: isLight
              ? "0 8px 24px rgba(24, 52, 58, 0.05)"
              : "0 12px 30px rgba(0, 0, 0, 0.14)",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 750 },
        },
      },
    },
  });
}
