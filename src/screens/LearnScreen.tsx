import {
  ArrowForwardRounded,
  AutoStoriesRounded,
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
  const progressStages = [
    {
      key: "new",
      label: "New",
      count: stageCounts.newCount,
      color: "text.disabled",
    },
    {
      key: "review1",
      label: "Review ×1",
      count: stageCounts.review1Count,
      color: "warning.main",
    },
    {
      key: "review2",
      label: "Review ×2",
      count: stageCounts.review2Count,
      color: "primary.main",
    },
    {
      key: "learned",
      label: "Learned",
      count: stageCounts.learnedCount,
      color: "success.main",
    },
  ];
  const progressTotal = progressStages.reduce(
    (total, stage) => total + stage.count,
    0,
  );
  const masteredPercent =
    cards.length === 0
      ? 0
      : Math.round((stageCounts.learnedCount * 100) / cards.length);

  return (
    <Stack spacing={3}>
      <Stack
        spacing={1.5}
        component="section"
        aria-label="Learning progress by stage"
        sx={{ width: "100%" }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", width: "100%" }}
        >
          <AutoStoriesRounded color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>
              Learning path
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {cards.length} cards across four stages
            </Typography>
          </Box>
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={`${masteredPercent}% mastered`}
            sx={{ fontWeight: 700 }}
          />
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

        <Box
          role="img"
          aria-label={progressStages
            .map(({ label, count }) => `${label}: ${count}`)
            .join(", ")}
          sx={{
            display: "flex",
            gap: 0.5,
            height: 10,
            overflow: "hidden",
            borderRadius: 999,
            bgcolor: "action.hover",
          }}
        >
          {progressStages.map(
            (stage) =>
              stage.count > 0 && (
                <Box
                  key={stage.key}
                  sx={{
                    flexGrow: stage.count,
                    flexBasis: 0,
                    minWidth: 0,
                    bgcolor: stage.color,
                    borderRadius: 999,
                  }}
                />
              ),
          )}
          {progressTotal === 0 && <Box sx={{ flex: 1, bgcolor: "divider" }} />}
        </Box>

        <Stack
          direction="row"
          spacing={{ xs: 1.5, sm: 3 }}
          useFlexGap
          sx={{ flexWrap: "wrap", rowGap: 1 }}
        >
          {progressStages.map((stage) => (
            <Stack
              key={stage.key}
              direction="row"
              spacing={0.75}
              sx={{ alignItems: "center" }}
            >
              <Box
                aria-hidden="true"
                sx={{
                  width: 8,
                  height: 8,
                  flex: "none",
                  borderRadius: "50%",
                  bgcolor: stage.color,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {stage.label}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {stage.count}
              </Typography>
            </Stack>
          ))}
        </Stack>
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
          minHeight: { xs: 300, sm: 320, md: 340 },
          display: "grid",
          gridTemplateRows: "auto minmax(0, 1fr) 88px",
          gap: { xs: 1.5, sm: 2 },
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
          spacing={0}
          sx={{
            alignItems: "center",
            justifyContent: "center",
            minWidth: 0,
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
        </Stack>

        <Box
          sx={{
            height: 88,
            minWidth: 0,
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            borderTop: "1px solid",
            borderColor:
              learning.lastSpokenAnswer || learning.answerRevealed
                ? "divider"
                : "transparent",
            pt: 1,
          }}
        >
          <Stack spacing={0.25} sx={{ width: "100%", alignItems: "center" }}>
            {learning.lastSpokenAnswer && currentCard ? (
              learning.answerRevealed ? (
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 600,
                    mx: "auto",
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
                    alignItems: "center",
                    gap: { xs: 1, sm: 2.5 },
                  }}
                >
                  <Stack
                    spacing={0.5}
                    sx={{ minWidth: 0, textAlign: "center" }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: "center", justifyContent: "center" }}
                    >
                      <MicRounded
                        sx={{ fontSize: 15, color: "text.secondary" }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        You said
                      </Typography>
                    </Stack>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color:
                          feedbackLabel === "Correct"
                            ? "success.main"
                            : feedbackLabel === "Wrong"
                              ? "error.main"
                              : "text.primary",
                        fontWeight: 600,
                        overflowWrap: "anywhere",
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                      }}
                    >
                      {learning.lastSpokenAnswer}
                    </Typography>
                  </Stack>
                  <ArrowForwardRounded
                    aria-hidden="true"
                    sx={{ color: "text.disabled", fontSize: 20 }}
                  />
                  <Stack
                    spacing={0.5}
                    sx={{ minWidth: 0, textAlign: "center" }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.5}
                      sx={{ alignItems: "center", justifyContent: "center" }}
                    >
                      <CheckCircleRounded
                        sx={{ fontSize: 15, color: "success.main" }}
                      />
                      <Typography variant="caption" color="success.main">
                        Correct answer
                      </Typography>
                    </Stack>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        color: "success.main",
                        fontWeight: 700,
                        overflowWrap: "anywhere",
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                        overflow: "hidden",
                      }}
                    >
                      {getAnswerText(currentCard)}
                    </Typography>
                  </Stack>
                </Box>
              ) : (
                <Stack
                  spacing={0.5}
                  sx={{
                    maxWidth: 600,
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", justifyContent: "center" }}
                  >
                    <MicRounded
                      sx={{ fontSize: 15, color: "text.secondary" }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      You said
                    </Typography>
                  </Stack>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color:
                        feedbackLabel === "Correct"
                          ? "success.main"
                          : feedbackLabel === "Wrong"
                            ? "error.main"
                            : "text.primary",
                      fontWeight: 600,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {learning.lastSpokenAnswer}
                  </Typography>
                </Stack>
              )
            ) : learning.answerRevealed && currentCard ? (
              <Stack spacing={0.25} sx={{ alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  Correct answer
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    overflowWrap: "anywhere",
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    overflow: "hidden",
                  }}
                >
                  {getAnswerText(currentCard)}
                </Typography>
              </Stack>
            ) : null}
          </Stack>
        </Box>
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
