import {
  MicRounded,
  PauseRounded,
  ReplayRounded,
  SkipNextRounded,
} from "@mui/icons-material";
import { Button, Card, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useMemo } from "react";
import { useLearningSession } from "../hooks/useLearningSession";
import { useAppStore } from "../store/useAppStore";
import {
  countStages,
  getNextDueTimestamp,
  getStageName,
} from "../utils/cardProgress";

export function LearnScreen() {
  const cards = useAppStore((state) => state.cards);
  const currentCard = useAppStore((state) => state.currentCard);
  const now = useAppStore((state) => state.now);
  const progress = useAppStore((state) => state.progress);

  const stageCounts = useMemo(() => countStages(progress), [progress]);
  const nextDueTimestamp = useMemo(
    () => getNextDueTimestamp(cards, progress),
    [cards, progress],
  );
  const learning = useLearningSession({ nextDueTimestamp });

  useEffect(() => {
    learning.startLearningSession();
  }, []);

  const waitingMessage =
    nextDueTimestamp === null
      ? "All cards learned 🎉"
      : `Next review in ${Math.max(0, Math.ceil((nextDueTimestamp - now) / 1000))} sec`;

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="overline" color="text.secondary">
          Learning session
        </Typography>
        <Chip
          label={`${stageCounts.learnedCount} / ${cards.length} learned`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      <Card
        elevation={0}
        sx={{
          borderRadius: 5,
          p: { xs: 3, md: 4 },
          minHeight: 260,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgba(79,70,229,0.06), rgba(148,163,184,0.04))",
        }}
      >
        <Stack spacing={1.5} alignItems="center" textAlign="center">
          <Typography variant="overline" color="text.secondary">
            {currentCard
              ? getStageName(progress[currentCard.text]?.stage || 0)
              : "No cards are due"}
          </Typography>
          <Typography
            variant="h2"
            sx={{ fontWeight: 800, letterSpacing: -0.06 }}
          >
            {currentCard?.text || "🎉 Great job!"}
          </Typography>
        </Stack>
      </Card>

      <Stack spacing={1.5}>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ minHeight: 24 }}
        >
          {currentCard ? learning.recognizedText : waitingMessage}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            minHeight: 24,
            color:
              learning.resultClass === "correct"
                ? "success.main"
                : learning.resultClass === "wrong"
                  ? "error.main"
                  : "text.secondary",
            fontWeight: 600,
          }}
        >
          {learning.result}
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Button
          variant={learning.listening ? "contained" : "outlined"}
          color={learning.listening ? "error" : "primary"}
          onClick={learning.toggleListening}
          disabled={!learning.speechSupported || !currentCard}
          startIcon={learning.listening ? <PauseRounded /> : <MicRounded />}
          sx={{ flex: 1 }}
        >
          {learning.listening ? "Stop listening" : "Start listening"}
        </Button>
        <Button
          variant="outlined"
          onClick={learning.repeatCurrentCard}
          disabled={!currentCard}
          startIcon={<ReplayRounded />}
          sx={{ flex: 1 }}
        >
          Repeat
        </Button>
        <Button
          variant="outlined"
          onClick={learning.skipCurrentCard}
          disabled={!currentCard || !learning.skipEnabled}
          startIcon={<SkipNextRounded />}
          sx={{ flex: 1 }}
        >
          Skip
        </Button>
      </Stack>
    </Stack>
  );
}
