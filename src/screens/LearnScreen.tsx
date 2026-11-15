import {
  ArrowForwardRounded,
  CheckRounded,
  CloseRounded,
  StopRounded,
  VolumeUpRounded,
} from "@mui/icons-material";
import {
  Box,
  Card,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getStageBadgeColor, StatusBadge } from "../components/StatusBadge";
import { useLearningSession } from "../hooks/useLearningSession";
import { useAppStore } from "../store/useAppStore";
import {
  countStages,
  getAnswerText,
  getNextDueTimestamp,
  getStageName,
  LEARNING_STAGES,
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
      ? "All cards mastered 🎉"
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
  const progressStages = LEARNING_STAGES.map((stage, index) => {
    const color = getStageBadgeColor(index);
    return {
      key: stage.label,
      label: stage.label,
      count: stageCounts[index],
      color: color === "default" ? "grey.600" : `${color}.main`,
    };
  });
  const progressTotal = progressStages.reduce(
    (total, stage) => total + stage.count,
    0,
  );
  return (
    <Stack spacing={3}>
      <Stack
        direction="row"
        spacing={1.5}
        component="section"
        aria-label="Learning progress by stage"
        sx={{ width: "100%", alignItems: "center" }}
      >
        <Box
          role="img"
          aria-label={progressStages
            .map(({ label, count }) => `${label}: ${count}`)
            .join(", ")}
          sx={{
            display: "flex",
            flex: 1,
            minWidth: 0,
            gap: 0.5,
            height: 24,
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
          minHeight: { xs: 300, sm: 320, md: 340 },
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gridTemplateRows: "auto minmax(0, 1fr) auto",
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ alignItems: "center", flexWrap: "wrap", gridColumn: "1 / -1" }}
        >
          {currentStage !== null && (
            <StatusBadge
              color={getStageBadgeColor(currentStage)}
              label={getStageName(currentStage)}
            />
          )}
          {feedbackLabel && (
            <StatusBadge
              color={feedbackLabel === "Correct" ? "success" : "error"}
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
          {!currentCard && (
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              {waitingMessage}
            </Typography>
          )}
        </Stack>
        {currentCard && (
          <Stack
            spacing={1}
            sx={{ gridColumn: 2, gridRow: "2 / 4", justifyContent: "center" }}
          >
            {learning.answerRevealed ? (
              <>
                <Tooltip title="Correct">
                  <span>
                    <IconButton
                      aria-label="Correct"
                      color="success"
                      disabled={Boolean(feedbackLabel)}
                      onClick={() => learning.gradeAnswer(true)}
                      sx={{
                        width: 48,
                        height: 48,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                      }}
                    >
                      <CheckRounded />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Incorrect">
                  <span>
                    <IconButton
                      aria-label="Incorrect"
                      color="error"
                      disabled={Boolean(feedbackLabel)}
                      onClick={() => learning.gradeAnswer(false)}
                      sx={{
                        width: 48,
                        height: 48,
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                      }}
                    >
                      <CloseRounded />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            ) : (
              <>
                <Tooltip
                  title={
                    learning.isSpeaking
                      ? "Stop pronunciation"
                      : "Pronounce text"
                  }
                >
                  <IconButton
                    aria-label={
                      learning.isSpeaking
                        ? "Stop pronunciation"
                        : "Pronounce text"
                    }
                    onClick={learning.pronounceCurrentCard}
                    sx={{
                      width: 48,
                      height: 48,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    {learning.isSpeaking ? (
                      <StopRounded />
                    ) : (
                      <VolumeUpRounded />
                    )}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Show answer">
                  <IconButton
                    aria-label="Show answer"
                    color="primary"
                    onClick={learning.revealAnswer}
                    sx={{
                      width: 48,
                      height: 48,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  >
                    <ArrowForwardRounded />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        )}
        {learning.answerRevealed && currentCard && (
          <Stack
            spacing={0.25}
            sx={{
              minWidth: 0,
              alignItems: "center",
              textAlign: "center",
              borderTop: 1,
              borderColor: "divider",
              pt: 1,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Correct answer
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                overflowWrap: "anywhere",
                maxWidth: "100%",
              }}
            >
              {getAnswerText(currentCard)}
            </Typography>
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
