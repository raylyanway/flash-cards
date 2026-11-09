import { AutoStoriesRounded, TranslateRounded } from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import { useAppStore } from "../store/useAppStore";

export function AppLoader() {
  const themePreference = useAppStore((state) => state.theme);
  const isDark =
    themePreference === "dark" ||
    (themePreference === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const colors = isDark
    ? {
        background: "#101c21",
        paper: "#17282d",
        primary: "#48c6c8",
        primarySoft: "rgba(72, 198, 200, 0.14)",
        secondary: "#ff9d73",
        text: "#eff8f5",
        muted: "#adc4c2",
        border: "rgba(140, 226, 222, 0.2)",
        dot: "rgba(140, 226, 222, 0.16)",
      }
    : {
        background: "#f6f7f2",
        paper: "#fffefa",
        primary: "#087f8c",
        primarySoft: "rgba(8, 127, 140, 0.1)",
        secondary: "#ef8354",
        text: "#18343a",
        muted: "#607477",
        border: "rgba(8, 127, 140, 0.18)",
        dot: "rgba(8, 127, 140, 0.13)",
      };

  return (
    <Box
      component="main"
      role="status"
      aria-live="polite"
      aria-busy="true"
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        px: 2,
        bgcolor: colors.background,
        color: colors.text,
        backgroundImage: `radial-gradient(${colors.dot} 1px, transparent 1px)`,
        backgroundSize: "28px 28px",
      }}
    >
      <Stack spacing={2.5} sx={{ alignItems: "center" }}>
        <Box
          aria-hidden="true"
          sx={{
            position: "relative",
            width: 224,
            height: 156,
            maxWidth: "80vw",
            perspective: "800px",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: "16px 12px 10px 28px",
              borderRadius: 2,
              bgcolor: colors.secondary,
              opacity: 0.72,
              transform: "rotate(8deg)",
              animation: "trailRight 3s ease-in-out infinite",
              "@keyframes trailRight": {
                "0%, 100%": { transform: "translate(0, 0) rotate(8deg)" },
                "50%": { transform: "translate(7px, -4px) rotate(11deg)" },
              },
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
              },
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: "12px 30px 12px 10px",
              borderRadius: 2,
              bgcolor: colors.primary,
              opacity: 0.6,
              transform: "rotate(-8deg)",
              animation: "trailLeft 3s ease-in-out infinite",
              "@keyframes trailLeft": {
                "0%, 100%": { transform: "translate(0, 0) rotate(-8deg)" },
                "50%": { transform: "translate(-7px, 3px) rotate(-11deg)" },
              },
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
              },
            }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: "4px 20px 16px 20px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              p: 2,
              border: "1px solid",
              borderColor: colors.border,
              borderRadius: 2,
              bgcolor: colors.paper,
              boxShadow: isDark
                ? "0 18px 44px rgba(0, 0, 0, 0.3)"
                : "0 18px 44px rgba(24, 52, 58, 0.12)",
              animation: "cardLift 2.8s ease-in-out infinite",
              "@keyframes cardLift": {
                "0%, 100%": { transform: "translateY(0) rotate(-1deg)" },
                "50%": { transform: "translateY(-5px) rotate(1deg)" },
              },
              "@media (prefers-reduced-motion: reduce)": {
                animation: "none",
              },
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 1,
                  bgcolor: colors.primarySoft,
                  color: colors.primary,
                }}
              >
                <AutoStoriesRounded fontSize="small" />
              </Box>
              <Typography
                variant="caption"
                sx={{ color: colors.muted, fontWeight: 700 }}
              >
                ENGLISH / RUSSIAN
              </Typography>
              <TranslateRounded
                sx={{ ml: "auto !important", color: colors.secondary }}
              />
            </Stack>
            <Box>
              <Typography
                variant="h5"
                sx={{ color: colors.text, fontWeight: 800 }}
              >
                hello
              </Typography>
              <Typography variant="body2" sx={{ color: colors.muted }}>
                привет
              </Typography>
            </Box>
          </Box>
        </Box>

        <Stack spacing={0.5} sx={{ alignItems: "center" }}>
          <Typography variant="h5" sx={{ color: colors.text, fontWeight: 750 }}>
            Flash Cards
          </Typography>
          <Typography variant="body2" sx={{ color: colors.muted }}>
            Loading your study group...
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75} aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <Box
              key={index}
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                bgcolor: index === 1 ? colors.secondary : colors.primary,
                animation: `loadingDot 1.1s ease-in-out ${index * 0.16}s infinite`,
                "@keyframes loadingDot": {
                  "0%, 80%, 100%": { opacity: 0.35, transform: "scale(0.8)" },
                  "40%": { opacity: 1, transform: "scale(1.15)" },
                },
                "@media (prefers-reduced-motion: reduce)": {
                  animation: "none",
                },
              }}
            />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
