import type { Card, GroupProgress, ProgressEntry } from "../types";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const LEARNING_STAGES = [
  { label: "New", delay: 0 },
  { label: "1m", delay: MINUTE },
  { label: "10m", delay: 10 * MINUTE },
  { label: "1h", delay: HOUR },
  { label: "6h", delay: 6 * HOUR },
  { label: "1d", delay: DAY },
  { label: "2d", delay: 2 * DAY },
  { label: "3d", delay: 3 * DAY },
  { label: "5d", delay: 5 * DAY },
  { label: "7d", delay: 7 * DAY },
  { label: "10d", delay: 10 * DAY },
  { label: "14d", delay: 14 * DAY },
  { label: "18d", delay: 18 * DAY },
  { label: "24d", delay: 24 * DAY },
  { label: "30d", delay: 30 * DAY },
  { label: "Mastered", delay: 0 },
] as const;

export const MASTERED_STAGE = LEARNING_STAGES.length - 1;

export function gradeProgress(
  entry: ProgressEntry,
  correct: boolean,
  now: number,
): ProgressEntry {
  const stage = correct
    ? Math.min(MASTERED_STAGE, entry.stage + 1)
    : Math.max(0, entry.stage - 1);
  const delay =
    stage === 0 ? LEARNING_STAGES[1].delay : LEARNING_STAGES[stage].delay;
  return {
    ...entry,
    stage,
    review: stage === MASTERED_STAGE ? 0 : now + delay,
  };
}

export function initializeMissingProgress(
  cards: Card[],
  progress: GroupProgress,
) {
  const next = { ...progress };
  for (const card of cards) {
    if (!next[card.text]) {
      next[card.text] = { stage: 0, review: 0 };
    }
  }
  return next;
}

export function getStageName(stage: number) {
  return LEARNING_STAGES[stage]?.label ?? "Unknown";
}

export function getAnswerText(card: Card) {
  return Array.isArray(card.answers)
    ? card.answers.join(", ")
    : card.answers || card.text;
}

export function countStages(progress: GroupProgress) {
  return Object.values(progress).reduce((counts, item) => {
    if (item.stage >= 0 && item.stage <= MASTERED_STAGE) {
      counts[item.stage] += 1;
    }
    return counts;
  }, Array<number>(LEARNING_STAGES.length).fill(0));
}

export function getCompletePercent(cards: Card[], progress: GroupProgress) {
  if (cards.length === 0) return 0;
  return Math.round(
    (countStages(progress)[MASTERED_STAGE] * 100) / cards.length,
  );
}

export function getNextDueTimestamp(cards: Card[], progress: GroupProgress) {
  let nextTime: number | null = null;
  for (const card of cards) {
    const cardProgress = progress[card.text];
    if (!cardProgress || cardProgress.stage >= MASTERED_STAGE) continue;
    if (nextTime === null || cardProgress.review < nextTime) {
      nextTime = cardProgress.review;
    }
  }
  return nextTime;
}

export function formatReviewWait(milliseconds: number) {
  let seconds = Math.max(0, Math.ceil(milliseconds / SECOND));
  const units = [
    { seconds: DAY / SECOND, label: "day" },
    { seconds: HOUR / SECOND, label: "hr" },
    { seconds: MINUTE / SECOND, label: "min" },
    { seconds: 1, label: "sec" },
  ];
  const parts: string[] = [];
  for (const unit of units) {
    const value = Math.floor(seconds / unit.seconds);
    if (value > 0) {
      parts.push(
        `${value} ${unit.label}${unit.label === "day" && value !== 1 ? "s" : ""}`,
      );
      seconds %= unit.seconds;
    }
    if (parts.length === 2) break;
  }
  return parts.join(" ") || "0 sec";
}

export function getNextReviewLabel(progress: GroupProgress, now: number) {
  let nearest: number | null = null;
  for (const item of Object.values(progress)) {
    if (item.stage < MASTERED_STAGE && item.review > now) {
      if (nearest === null || item.review < nearest) {
        nearest = item.review;
      }
    }
  }
  if (nearest === null) return "Ready now";
  return formatReviewWait(nearest - now);
}
