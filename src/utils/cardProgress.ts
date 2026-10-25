import type { Card, GroupProgress } from "../types";

export const REVIEW_1_DELAY = 30 * 1000;
export const REVIEW_2_DELAY = 60 * 1000;
export const MAX_WRONG_ATTEMPTS = 3;

export function initializeMissingProgress(
  cards: Card[],
  progress: GroupProgress,
) {
  const next = { ...progress };
  for (const card of cards) {
    if (!next[card.text]) {
      next[card.text] = { stage: 0, nextReview: 0, correctCount: 0 };
    }
  }
  return next;
}

export function getStageName(stage: number) {
  switch (stage) {
    case 0:
      return "🆕 New";
    case 1:
      return "🔁 Repeat x1";
    case 2:
      return "🔁 Repeat x2";
    case 3:
      return "✅ Learned";
    default:
      return "Unknown";
  }
}

export function getStageClass(stage: number) {
  return (
    ["status-new", "status-review1", "status-review2", "status-learned"][
      stage
    ] || ""
  );
}

export function getAnswerText(card: Card) {
  return Array.isArray(card.answers)
    ? card.answers.join(", ")
    : card.answers || card.text;
}

export function normalizeAnswer(text: string) {
  return text
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/\p{P}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAnswerMatch(text: string, answers: string[]) {
  const normalizedText = Array.from(normalizeAnswer(text));
  if (normalizedText.length === 0) return false;

  return answers.some((answer) => {
    const normalizedAnswer = Array.from(normalizeAnswer(answer));
    const maxLength = Math.max(normalizedText.length, normalizedAnswer.length);
    if (
      normalizedAnswer.length === 0 ||
      Math.abs(normalizedText.length - normalizedAnswer.length) * 5 > maxLength
    ) {
      return false;
    }

    let previousRow = Array.from(
      { length: normalizedAnswer.length + 1 },
      (_, index) => index,
    );
    for (let textIndex = 1; textIndex <= normalizedText.length; textIndex++) {
      const currentRow = [textIndex];
      for (
        let answerIndex = 1;
        answerIndex <= normalizedAnswer.length;
        answerIndex++
      ) {
        currentRow[answerIndex] = Math.min(
          currentRow[answerIndex - 1] + 1,
          previousRow[answerIndex] + 1,
          previousRow[answerIndex - 1] +
            Number(
              normalizedText[textIndex - 1] !==
                normalizedAnswer[answerIndex - 1],
            ),
        );
      }
      previousRow = currentRow;
    }

    return previousRow[normalizedAnswer.length] * 5 <= maxLength;
  });
}

export function countStages(progress: GroupProgress) {
  return Object.values(progress).reduce(
    (counts, item) => {
      if (item.stage === 3) counts.learnedCount += 1;
      else if (item.stage === 2) counts.review2Count += 1;
      else if (item.stage === 1) counts.review1Count += 1;
      else if (item.stage === 0) counts.newCount += 1;
      return counts;
    },
    {
      learnedCount: 0,
      review2Count: 0,
      review1Count: 0,
      newCount: 0,
    },
  );
}

export function getCompletePercent(cards: Card[], progress: GroupProgress) {
  if (cards.length === 0) return 0;
  return Math.round((countStages(progress).learnedCount * 100) / cards.length);
}

export function getNextDueTimestamp(cards: Card[], progress: GroupProgress) {
  let nextTime: number | null = null;
  for (const card of cards) {
    const cardProgress = progress[card.text];
    if (!cardProgress || cardProgress.stage >= 3) continue;
    if (nextTime === null || cardProgress.nextReview < nextTime) {
      nextTime = cardProgress.nextReview;
    }
  }
  return nextTime;
}

export function getNextReviewLabel(progress: GroupProgress, now: number) {
  let nearest: number | null = null;
  for (const item of Object.values(progress)) {
    if (item.stage < 3 && item.nextReview > now) {
      if (nearest === null || item.nextReview < nearest) {
        nearest = item.nextReview;
      }
    }
  }
  if (nearest === null) return "Ready now";
  return `${Math.max(0, Math.ceil((nearest - now) / 1000))} sec`;
}

export function getAttemptsText(attempts: number) {
  const attemptsLeft = Math.max(0, MAX_WRONG_ATTEMPTS - attempts);
  return attemptsLeft > 0
    ? `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`
    : "No attempts left";
}
