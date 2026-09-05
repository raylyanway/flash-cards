import { Box, CircularProgress, Stack, Typography } from "@mui/material";

export function AppLoader() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        bgcolor: "background.default",
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <Stack alignItems="center" spacing={2}>
        <CircularProgress size={46} />
        <Box textAlign="center">
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Flash Cards
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Loading your study set...
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
