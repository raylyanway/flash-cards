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
      <Stack spacing={2}>
        <CircularProgress size={46} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Flash Cards
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Loading your study group...
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
