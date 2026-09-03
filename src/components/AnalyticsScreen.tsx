import {
  AnalyticsRounded,
  SettingsSuggestRounded,
  SyncRounded,
} from "@mui/icons-material";
import {
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  countStages,
  getAnswerText,
  getStageName,
  initializeMissingProgress,
} from "../utils/cardProgress";
import { PageHeader } from "./ui/PageHeader";

export function AnalyticsScreen() {
  const cards = useAppStore((state) => state.cards);
  const currentSet = useAppStore((state) => state.currentSet);
  const progress = useAppStore((state) => state.progress);
  const saveProgress = useAppStore((state) => state.saveProgress);
  const setProgressSearch = useAppStore((state) => state.setProgressSearch);
  const setScreen = useAppStore((state) => state.setScreen);
  const setSetupBackup = useAppStore((state) => state.setSetupBackup);

  const stageCounts = useMemo(() => countStages(progress), [progress]);
  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.text.localeCompare(b.text)),
    [cards],
  );

  const resetProgress = async () => {
    if (!confirm(`Reset progress for "${currentSet}"?`)) return;
    const nextProgress = initializeMissingProgress(cards, {});
    await saveProgress(nextProgress);
  };

  const openProgressSetup = () => {
    setSetupBackup(progress);
    setProgressSearch("");
    setScreen("progressSetup");
  };

  return (
    <>
      <PageHeader
        icon={<AnalyticsRounded />}
        title="Analytics"
        description="A quick view of your current progress and the cards in this set."
      />

      <Stack spacing={3}>
        <Grid container spacing={2}>
          {[
            {
              label: "Learned",
              value: stageCounts.learnedCount,
              color: "primary",
            },
            {
              label: "Repeat x2",
              value: stageCounts.review2Count,
              color: "secondary",
            },
            {
              label: "Repeat x1",
              value: stageCounts.review1Count,
              color: "warning",
            },
            { label: "New", value: stageCounts.newCount, color: "success" },
          ].map((item) => (
            <Grid size={{ xs: 6, md: 3 }} key={item.label}>
              <Card elevation={0} sx={{ borderRadius: 4, height: "100%" }}>
                <CardContent sx={{ textAlign: "center", py: 3 }}>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 800, color: `${item.color}.main` }}
                  >
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Card elevation={0} sx={{ borderRadius: 4 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Text</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Correct answer</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedCards.map((card) => {
                  const cardProgress = progress[card.text] || { stage: 0 };
                  return (
                    <TableRow key={card.text} hover>
                      <TableCell>{card.text}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            color:
                              cardProgress.stage === 3
                                ? "success.main"
                                : cardProgress.stage === 0
                                  ? "text.secondary"
                                  : "warning.main",
                          }}
                        >
                          {getStageName(cardProgress.stage)}
                        </Typography>
                      </TableCell>
                      <TableCell>{getAnswerText(card)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<SyncRounded />}
            onClick={resetProgress}
          >
            Reset progress
          </Button>
          <Button
            variant="contained"
            startIcon={<SettingsSuggestRounded />}
            onClick={openProgressSetup}
          >
            Setup progress
          </Button>
        </Stack>
      </Stack>
    </>
  );
}
