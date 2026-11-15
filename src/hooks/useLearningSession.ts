import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { gradeProgress, MASTERED_STAGE } from "../utils/cardProgress";
import { speakWord } from "../utils/speech";

type UseLearningSessionParams = {
  nextDueTimestamp: number | null;
};

const ANSWER_DISPLAY_DELAY = 1_000;

export function useLearningSession({
  nextDueTimestamp,
}: UseLearningSessionParams) {
  const cards = useAppStore((state) => state.cards);
  const currentCard = useAppStore((state) => state.currentCard);
  const now = useAppStore((state) => state.now);
  const currentGroup = useAppStore((state) => state.currentGroup);
  const progress = useAppStore((state) => state.progress);
  const setCurrentCard = useAppStore((state) => state.setCurrentCard);
  const setProgress = useAppStore((state) => state.setProgress);
  const { pathname } = useLocation();
  const currentGroupProgress = progress[currentGroup];
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [resultClass, setResultClass] = useState<"" | "correct" | "wrong">("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const progressRef = useRef(currentGroupProgress);
  const cardsRef = useRef(cards);
  const sessionActiveRef = useRef(false);
  const gradingRef = useRef(false);
  const speechIdRef = useRef(0);

  const stopSpeaking = useCallback(() => {
    speechIdRef.current += 1;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const selectNextCard = useCallback(() => {
    if (!sessionActiveRef.current) return;
    const dueCards = cardsRef.current.filter((card) => {
      const cardProgress = progressRef.current[card.text];
      return Boolean(
        cardProgress &&
        cardProgress.stage < MASTERED_STAGE &&
        cardProgress.nextReview <= Date.now(),
      );
    });
    dueCards.sort(
      (first, second) =>
        progressRef.current[first.text].stage -
        progressRef.current[second.text].stage,
    );
    stopSpeaking();
    setAnswerRevealed(false);
    setResultClass("");
    gradingRef.current = false;
    setCurrentCard(dueCards[0] ?? null);
  }, [setCurrentCard, stopSpeaking]);

  useEffect(() => {
    progressRef.current = currentGroupProgress;
    cardsRef.current = cards;
  }, [cards, currentGroupProgress]);

  useEffect(() => {
    if (pathname !== "/learn" || currentCard) return;
    if (nextDueTimestamp !== null && nextDueTimestamp <= now) selectNextCard();
  }, [currentCard, pathname, nextDueTimestamp, now, selectNextCard]);

  useEffect(() => {
    return () => {
      sessionActiveRef.current = false;
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const startLearningSession = () => {
    sessionActiveRef.current = true;
    selectNextCard();
  };

  const stopLearningSession = () => {
    sessionActiveRef.current = false;
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
    stopSpeaking();
    setCurrentCard(null);
    setAnswerRevealed(false);
    setResultClass("");
  };

  const pronounceCurrentCard = () => {
    if (!currentCard) return;
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    const speechId = ++speechIdRef.current;
    setIsSpeaking(true);
    speakWord(currentCard.text, () => {
      if (speechId === speechIdRef.current) setIsSpeaking(false);
    });
  };

  const revealAnswer = () => {
    stopSpeaking();
    setAnswerRevealed(true);
  };

  const gradeAnswer = async (correct: boolean) => {
    if (!currentCard || !answerRevealed || gradingRef.current) return;
    gradingRef.current = true;
    const nextProgress = {
      ...progressRef.current,
      [currentCard.text]: gradeProgress(
        progressRef.current[currentCard.text],
        correct,
        Date.now(),
      ),
    };
    progressRef.current = nextProgress;
    setResultClass(correct ? "correct" : "wrong");
    await setProgress({ [currentGroup]: nextProgress });
    if (sessionActiveRef.current) {
      transitionTimerRef.current = window.setTimeout(
        selectNextCard,
        ANSWER_DISPLAY_DELAY,
      );
    }
  };

  return {
    answerRevealed,
    resultClass,
    isSpeaking,
    gradeAnswer,
    pronounceCurrentCard,
    revealAnswer,
    startLearningSession,
    stopLearningSession,
  };
}
