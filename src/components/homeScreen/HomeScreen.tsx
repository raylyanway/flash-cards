import { HomeRounded, PlayArrowRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import {
  getCompletePercent,
  getNextReviewLabel,
} from "../../utils/cardProgress";
import { PageHeader } from "../ui/PageHeader";

export function HomeScreen() {
  const cards = useAppStore((state) => state.cards);
  const currentSet = useAppStore((state) => state.currentSet);
  const now = useAppStore((state) => state.now);
  const progress = useAppStore((state) => state.progress);
  const setScreen = useAppStore((state) => state.setScreen);

  const completePercent = useMemo(
    () => getCompletePercent(cards, progress),
    [cards, progress],
  );

  const nextReviewLabel = useMemo(
    () => getNextReviewLabel(progress, now),
    [now, progress],
  );

  const totalCards = cards.length;
  const learnedCount = useMemo(
    () => Object.values(progress).filter((p) => p.stage === 3).length,
    [progress],
  );

  const dueCount = useMemo(() => {
    const nowTs = Date.now();
    return Object.values(progress).filter(
      (p) => p.stage < 3 && p.nextReview <= nowTs,
    ).length;
  }, [progress, now]);

  return (
    <>
      <PageHeader
        icon={<HomeRounded />}
        title="Study overview"
        description="Review what’s due, track your progress, and jump back in with a clean daily rhythm."
      />

      <Card elevation={0} sx={{ borderRadius: 4, mb: 3 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Current set
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {currentSet}
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<PlayArrowRounded />}
              onClick={() => setScreen("learn")}
              sx={{ minWidth: 180 }}
            >
              Start review
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card elevation={0} sx={{ borderRadius: 4, height: "100%" }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={3}
                alignItems="center"
              >
                <Box sx={{ width: { xs: 170, sm: 190 }, mx: "auto" }}>
                  <Box
                    sx={{
                      position: "relative",
                      width: 170,
                      height: 170,
                      mx: "auto",
                    }}
                  >
                    <Box
                      sx={(theme) => ({
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        background: `conic-gradient(${theme.palette.primary.main} ${completePercent * 3.6}deg, rgba(148,163,184,0.16) 0deg)`,
                      })}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 16,
                        borderRadius: "50%",
                        bgcolor: "background.paper",
                        display: "grid",
                        placeItems: "center",
                        border: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Box textAlign="center">
                        <Typography
                          variant="h4"
                          sx={{ fontWeight: 800, lineHeight: 1 }}
                        >
                          {completePercent}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Mastered
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Stack spacing={2} sx={{ width: "100%" }}>
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {learnedCount} of {totalCards} cards completed
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={completePercent}
                    sx={{
                      height: 10,
                      borderRadius: 99,
                      bgcolor: "rgba(148,163,184,0.18)",
                    }}
                  />

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 4 }}>
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: 3,
                          bgcolor: "rgba(99,102,241,0.08)",
                        }}
                      >
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 700, color: "primary.main" }}
                          >
                            {totalCards}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Cards
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: 3,
                          bgcolor: "rgba(34,197,94,0.08)",
                        }}
                      >
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 700, color: "success.main" }}
                          >
                            {learnedCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Learned
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Card
                        elevation={0}
                        sx={{
                          borderRadius: 3,
                          bgcolor: "rgba(245,158,11,0.08)",
                        }}
                      >
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 700, color: "warning.main" }}
                          >
                            {dueCount}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Due now
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card elevation={0} sx={{ borderRadius: 4, height: "100%" }}>
            <CardContent sx={{ p: { xs: 2, md: 3 }, height: "100%" }}>
              <Stack spacing={2} sx={{ height: "100%" }}>
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Next review
                  </Typography>
                  <Typography
                    variant="h3"
                    sx={{ fontWeight: 800, letterSpacing: -0.05 }}
                  >
                    {nextReviewLabel}
                  </Typography>
                </Box>
                <Chip
                  label={
                    dueCount > 0
                      ? `${dueCount} cards are ready`
                      : "You’re all caught up"
                  }
                  color={dueCount > 0 ? "warning" : "success"}
                  sx={{ alignSelf: "flex-start", fontWeight: 700 }}
                />
                <Typography variant="body1" color="text.secondary">
                  {dueCount > 0
                    ? "A few cards are ready for another pass. Keep the momentum going."
                    : "You are all caught up for now. A fresh review can still strengthen recall."}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<PlayArrowRounded />}
                  onClick={() => setScreen("learn")}
                  sx={{ mt: "auto" }}
                >
                  Continue learning
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
