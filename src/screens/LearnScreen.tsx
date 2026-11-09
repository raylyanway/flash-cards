import {
  CheckCircleRounded,
  CloseRounded,
  ErrorOutlineRounded,
  MicRounded,
  PauseRounded,
  ReplayRounded,
  SkipNextRounded,
  VisibilityRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLearningSession } from "../hooks/useLearningSession";
import { useAppStore } from "../store/useAppStore";
import {
  countStages,
  getAnswerText,
  getNextDueTimestamp,
  getStageName,
} from "../utils/cardProgress";

export function LearnScreen() {
  const navigate = useNavigate();
  const cards = useAppStore((state) => state.cards);
  const currentCard = useAppStore((state) => state.currentCard);
  const currentGroup = useAppStore((state) => state.currentGroup);
  const now = useAppStore((state) => state.now);
  const progress = useAppStore((state) => state.progress);
  const currentGroupProgress = progress[currentGroup];

  const stageCounts = useMemo(
    () => countStages(currentGroupProgress),
    [currentGroupProgress],
  );
  const nextDueTimestamp = useMemo(
    () => getNextDueTimestamp(cards, currentGroupProgress),
    [cards, currentGroupProgress],
  );
  const learning = useLearningSession({ nextDueTimestamp });

  useEffect(() => {
    learning.startLearningSession();
  }, []);

  const waitingMessage =
    nextDueTimestamp === null
      ? "All cards learned 🎉"
      : `Next review in ${Math.max(0, Math.ceil((nextDueTimestamp - now) / 1000))} sec`;
  const currentStage = currentCard
    ? (currentGroupProgress[currentCard.text]?.stage ?? 0)
    : null;
  const feedbackLabel =
    learning.resultClass === "correct"
      ? "Correct"
      : learning.resultClass === "wrong"
        ? "Wrong"
        : null;

  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{ alignItems: "center", width: "100%" }}
      >
        <Typography variant="overline" color="text.secondary">
          Learning session
        </Typography>
        <Chip
          label={`${stageCounts.learnedCount} / ${cards.length} learned`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 700 }}
        />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Stop learning">
          <IconButton
            aria-label="Stop learning"
            color="error"
            onClick={() => {
              learning.stopLearningSession();
              navigate("/");
            }}
            sx={{
              width: 40,
              height: 40,
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            <CloseRounded />
          </IconButton>
        </Tooltip>
      </Stack>

      <Card
        elevation={0}
        sx={{
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          borderLeft: "4px solid",
          borderLeftColor:
            feedbackLabel === "Correct"
              ? "success.main"
              : feedbackLabel === "Wrong"
                ? "error.main"
                : "primary.main",
          bgcolor: "background.paper",
          p: { xs: 2, sm: 3, md: 4 },
          minHeight: { xs: 260, sm: 290, md: 320 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 3,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: "center", flexWrap: "wrap" }}
        >
          {currentStage !== null && (
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={getStageName(currentStage)}
            />
          )}
          {feedbackLabel && (
            <Chip
              size="small"
              color={feedbackLabel === "Correct" ? "success" : "error"}
              icon={
                feedbackLabel === "Correct" ? (
                  <CheckCircleRounded />
                ) : (
                  <ErrorOutlineRounded />
                )
              }
              label={feedbackLabel}
            />
          )}
          {currentStage === null && (
            <Typography variant="overline" color="text.secondary">
              No cards are due
            </Typography>
          )}
        </Stack>

        <Stack
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            textAlign: "center",
            py: 1,
          }}
        >
          <Typography
            component="h2"
            sx={{
              width: "100%",
              fontWeight: 800,
              fontSize: { xs: "1.75rem", sm: "2.5rem", md: "3.25rem" },
              lineHeight: 1.15,
              overflowWrap: "anywhere",
            }}
          >
            {currentCard?.text || "🎉 Great job!"}
          </Typography>
          {learning.answerRevealed && currentCard && (
            <Stack sx={{ mt: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {getAnswerText(currentCard)}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Card>

      <Stack spacing={1}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ minHeight: 20 }}
        >
          {currentCard ? learning.recognizedText : waitingMessage}
        </Typography>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Button
          variant={learning.listening ? "contained" : "outlined"}
          color={learning.listening ? "error" : "primary"}
          onClick={learning.toggleListening}
          disabled={
            !learning.speechSupported || !currentCard || learning.answerRevealed
          }
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
          startIcon={
            learning.answerRevealed ? (
              <SkipNextRounded />
            ) : (
              <VisibilityRounded />
            )
          }
          sx={{ flex: 1 }}
        >
          {learning.answerRevealed ? "Skip" : "Show answer"}
        </Button>
      </Stack>
    </Stack>
  );
}
