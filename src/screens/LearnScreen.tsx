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
  Collapse,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStageBadgeColor, StatusBadge } from "../components/StatusBadge";
import { useLearningSession } from "../hooks/useLearningSession";
import { useAppStore } from "../store/useAppStore";
import {
  countStages,
  formatReviewWait,
  getAnswerText,
  getNextDueTimestamp,
  getStageName,
  LEARNING_STAGES,
} from "../utils/cardProgress";

function useScrollFades(contentKey: string | null) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const updateEdges = () => {
    const element = elementRef.current;
    if (!element) return;

    const canScroll = element.scrollHeight > element.clientHeight + 1;
    const top = canScroll && element.scrollTop > 1;
    const bottom =
      canScroll &&
      element.scrollTop + element.clientHeight < element.scrollHeight - 1;
    setEdges((current) =>
      current.top === top && current.bottom === bottom
        ? current
        : { top, bottom },
    );
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new ResizeObserver(updateEdges);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    element.addEventListener("scroll", updateEdges, { passive: true });
    updateEdges();

    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", updateEdges);
    };
  }, [contentKey]);

  return { elementRef, edges, updateEdges };
}

export function LearnScreen() {
  const navigate = useNavigate();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const cards = useAppStore((state) => state.cards);
  const currentCard = useAppStore((state) => state.currentCard);
  const currentGroup = useAppStore((state) => state.currentGroup);
  const isLeftHanded = useAppStore((state) => state.isLeftHanded);
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

  const waitingMessage =
    nextDueTimestamp === null
      ? "All cards mastered 🎉"
      : `Next review in ${formatReviewWait(nextDueTimestamp - now)}`;
  const currentStage = currentCard
    ? (currentGroupProgress[currentCard.text]?.stage ?? 0)
    : null;
  const feedbackLabel =
    learning.resultClass === "correct"
      ? "Correct"
      : learning.resultClass === "wrong"
        ? "Wrong"
        : null;
  const cardAccentColor =
    feedbackLabel === "Correct"
      ? "success.main"
      : feedbackLabel === "Wrong"
        ? "error.main"
        : "primary.main";
  const [lastFeedbackLabel, setLastFeedbackLabel] = useState<string | null>(
    null,
  );
  const [revealedAnswerText, setRevealedAnswerText] = useState<string | null>(
    null,
  );
  const promptScroll = useScrollFades(currentCard?.text ?? null);
  const answerScroll = useScrollFades(revealedAnswerText);
  useEffect(() => {
    if (feedbackLabel) setLastFeedbackLabel(feedbackLabel);
  }, [feedbackLabel]);
  const progressStages = LEARNING_STAGES.map((stage, index) => {
    const color = getStageBadgeColor(index);
    return {
      key: stage.label,
      label: stage.label,
      count: stageCounts[index],
      color: color === "default" ? "grey.600" : `${color}.main`,
    };
  });
  const progressGroups = progressStages.reduce<
    { color: string; count: number }[]
  >((groups, stage) => {
    const group = groups.find((item) => item.color === stage.color);
    if (group) group.count += stage.count;
    else groups.push({ color: stage.color, count: stage.count });
    return groups;
  }, []);
  const progressTotal = progressStages.reduce(
    (total, stage) => total + stage.count,
    0,
  );
  return (
    <Stack
      spacing={3}
      sx={(theme) => ({
        height: `calc(100dvh - ${theme.spacing(4)})`,
        minHeight: 0,
        overflow: "hidden",
      })}
    >
      <Stack
        direction={isLeftHanded ? "row-reverse" : "row"}
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
            borderRadius: "4px",
            bgcolor: "action.hover",
          }}
        >
          {progressGroups.map(
            (group) =>
              group.count > 0 && (
                <Box
                  key={group.color}
                  sx={{
                    flexGrow: group.count,
                    flexBasis: 0,
                    minWidth: 0,
                    bgcolor: group.color,
                    borderRadius: "4px",
                  }}
                />
              ),
          )}
          {progressTotal === 0 && <Box sx={{ flex: 1, bgcolor: "divider" }} />}
        </Box>
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
      </Stack>

      <Card
        elevation={0}
        sx={{
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          borderLeft: isLeftHanded ? 0 : "4px solid",
          borderRight: isLeftHanded ? "4px solid" : 0,
          borderLeftColor: isLeftHanded ? "transparent" : cardAccentColor,
          borderRightColor: isLeftHanded ? cardAccentColor : "transparent",
          bgcolor: "background.paper",
          p: { xs: 2, sm: 3, md: 4 },
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: isLeftHanded
            ? "auto minmax(0, 1fr)"
            : "minmax(0, 1fr) auto",
          gridTemplateRows:
            currentCard && learning.answerRevealed
              ? "auto minmax(0, 1fr) minmax(0, 1fr)"
              : "auto minmax(0, 1fr) 0px",
          gap: { xs: 1.5, sm: 2 },
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            justifyContent: isLeftHanded ? "flex-end" : "flex-start",
            flexWrap: "wrap",
            gridColumn: "1 / -1",
          }}
        >
          {currentStage !== null && (
            <Box
              sx={{
                display: "inline-flex",
                "& .MuiChip-root": {
                  transition: "background-color 450ms ease, color 450ms ease",
                  "@media (prefers-reduced-motion: reduce)": {
                    transition: "none",
                  },
                },
              }}
            >
              <StatusBadge
                color={getStageBadgeColor(currentStage)}
                label={getStageName(currentStage)}
              />
            </Box>
          )}
          <Collapse
            orientation="horizontal"
            in={Boolean(feedbackLabel)}
            timeout={reduceMotion ? 0 : 450}
            unmountOnExit
            sx={{ "& .MuiCollapse-wrapperInner": { display: "flex" } }}
          >
            {(feedbackLabel || lastFeedbackLabel) && (
              <StatusBadge
                color={
                  (feedbackLabel || lastFeedbackLabel) === "Correct"
                    ? "success"
                    : "error"
                }
                label={feedbackLabel || lastFeedbackLabel || ""}
              />
            )}
          </Collapse>
          {currentStage === null && (
            <Typography variant="overline" color="text.secondary">
              No cards are due
            </Typography>
          )}
        </Stack>
        <Box
          sx={{
            position: "relative",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
            gridColumn: currentCard ? (isLeftHanded ? 2 : 1) : "1 / -1",
            gridRow: 2,
            "&::before": {
              content: promptScroll.edges.top ? '""' : "none",
              position: "absolute",
              zIndex: 1,
              top: 0,
              left: 0,
              right: 0,
              height: 24,
              borderRadius: 1,
              pointerEvents: "none",
              maskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              background: (theme) =>
                `linear-gradient(to bottom, ${alpha(theme.palette.primary.main, 0.12)}, transparent)`,
            },
            "&::after": {
              content: promptScroll.edges.bottom ? '""' : "none",
              position: "absolute",
              zIndex: 1,
              bottom: 0,
              left: 0,
              right: 0,
              height: 24,
              borderRadius: 1,
              pointerEvents: "none",
              maskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              background: (theme) =>
                `linear-gradient(to top, ${alpha(theme.palette.primary.main, 0.12)}, transparent)`,
            },
          }}
        >
          <Stack
            ref={promptScroll.elementRef}
            onScroll={promptScroll.updateEdges}
            sx={{
              height: "100%",
              minWidth: 0,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": { display: "none" },
              alignItems: "center",
              justifyContent: "safe center",
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
                flexShrink: 0,
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
        </Box>
        {currentCard && (
          <Stack
            spacing={1}
            sx={{
              gridColumn: isLeftHanded ? 1 : 2,
              gridRow: "2 / 4",
              justifyContent: "center",
            }}
          >
            {learning.answerRevealed ? (
              <>
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
              </>
            ) : (
              <>
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
                  {learning.isSpeaking ? <StopRounded /> : <VolumeUpRounded />}
                </IconButton>
                <IconButton
                  aria-label="Show answer"
                  color="primary"
                  onClick={() => {
                    setRevealedAnswerText(getAnswerText(currentCard));
                    learning.revealAnswer();
                  }}
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
              </>
            )}
          </Stack>
        )}
        {currentCard && learning.answerRevealed && (
          <Box
            sx={{
              gridColumn: isLeftHanded ? 2 : 1,
              gridRow: 3,
              alignSelf: "start",
              borderTop: 1,
              borderColor: "divider",
              transform: { xs: "translateY(-6px)", sm: "translateY(-8px)" },
            }}
          />
        )}
        <Box
          sx={{
            position: "relative",
            gridColumn: currentCard ? (isLeftHanded ? 2 : 1) : "1 / -1",
            gridRow: 3,
            minHeight: 0,
            overflow: "hidden",
            "&::before": {
              content: answerScroll.edges.top ? '""' : "none",
              position: "absolute",
              zIndex: 1,
              top: 0,
              left: 0,
              right: 0,
              height: 24,
              borderRadius: 1,
              pointerEvents: "none",
              maskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              background: (theme) =>
                `linear-gradient(to bottom, ${alpha(theme.palette.primary.main, 0.12)}, transparent)`,
            },
            "&::after": {
              content: answerScroll.edges.bottom ? '""' : "none",
              position: "absolute",
              zIndex: 1,
              bottom: 0,
              left: 0,
              right: 0,
              height: 24,
              borderRadius: 1,
              pointerEvents: "none",
              maskImage:
                "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
              background: (theme) =>
                `linear-gradient(to top, ${alpha(theme.palette.primary.main, 0.12)}, transparent)`,
            },
          }}
        >
          <Box
            ref={answerScroll.elementRef}
            onScroll={answerScroll.updateEdges}
            sx={{
              height: "100%",
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            <Collapse
              in={Boolean(learning.answerRevealed && currentCard)}
              timeout={reduceMotion ? 0 : 300}
              onExited={() => setRevealedAnswerText(null)}
              sx={{ minHeight: 0 }}
              unmountOnExit
            >
              <Stack
                spacing={0.25}
                sx={{
                  minWidth: 0,
                  minHeight: "100%",
                  alignItems: "center",
                  justifyContent: "safe center",
                  textAlign: "center",
                  pt: 1,
                  animation: "answerEnter 300ms ease-out both",
                  "@keyframes answerEnter": {
                    from: { opacity: 0, transform: "translateY(6px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                  },
                  "@media (prefers-reduced-motion: reduce)": {
                    animation: "none",
                  },
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    overflowWrap: "anywhere",
                    maxWidth: "100%",
                    flexShrink: 0,
                  }}
                >
                  {revealedAnswerText}
                </Typography>
              </Stack>
            </Collapse>
          </Box>
        </Box>
      </Card>
    </Stack>
  );
}
