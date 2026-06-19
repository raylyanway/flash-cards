import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSpeechRecognition,
  speakWord,
  type SpeechRecognitionInstance,
} from "../speech";
import type { Card, ProgressEntry, ProgressMap, Screen } from "../types";
import {
  getAnswerText,
  getAttemptsText,
  MAX_WRONG_ATTEMPTS,
  normalizeAnswer,
  REVIEW_1_DELAY,
  REVIEW_2_DELAY,
} from "../utils/cardProgress";

type UseLearningSessionParams = {
  cards: Card[];
  currentCard: Card | null;
  nextDueTimestamp: number | null;
  now: number;
  progress: ProgressMap;
  saveProgress: (progress: ProgressMap) => Promise<void>;
  screen: Screen;
  setCurrentCard: (card: Card | null) => void;
};

export function useLearningSession({
  cards,
  currentCard,
  nextDueTimestamp,
  now,
  progress,
  saveProgress,
  screen,
  setCurrentCard,
}: UseLearningSessionParams) {
  const [listening, setListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("Press Start Listening");
  const [result, setResult] = useState("");
  const [resultClass, setResultClass] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [skipEnabled, setSkipEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);

  const skippedCardsRef = useRef(new Set<string>());
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const progressRef = useRef(progress);
  const cardsRef = useRef(cards);
  const currentCardRef = useRef(currentCard);
  const listeningRef = useRef(listening);
  const wrongAttemptsRef = useRef(wrongAttempts);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    setListening(false);
    try {
      recognition?.stop();
    } catch {
      // Ignore speech API stop races.
    }
  }, []);

  const updateProgressForCard = useCallback(
    async (card: Card, updater: (entry: ProgressEntry) => ProgressEntry) => {
      const nextProgress = {
        ...progressRef.current,
        [card.text]: updater({ ...progressRef.current[card.text] }),
      };
      progressRef.current = nextProgress;
      await saveProgress(nextProgress);
      return nextProgress[card.text];
    },
    [saveProgress],
  );

  const selectNextCard = useCallback(() => {
    const dueCards = cardsRef.current.filter((card) => {
      if (skippedCardsRef.current.has(card.text)) return false;
      const cardProgress = progressRef.current[card.text];
      return Boolean(
        cardProgress &&
        cardProgress.stage < 3 &&
        cardProgress.nextReview <= Date.now(),
      );
    });

    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (dueCards.length === 0) {
      stopListening();
      setCurrentCard(null);
      setResult("");
      setSkipEnabled(false);
      return;
    }

    dueCards.sort(
      (a, b) =>
        progressRef.current[a.text].stage - progressRef.current[b.text].stage,
    );
    const nextCard = dueCards[0];
    setCurrentCard(nextCard);
    setWrongAttempts(0);
    setResult("");
    setResultClass("");
    setSkipEnabled(true);
    setRecognizedText(`Press Start Listening - ${getAttemptsText(0)}`);
    speakWord(nextCard.text);
  }, [setCurrentCard, stopListening]);

  const scheduleNextCard = useCallback(
    (delay: number) => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = window.setTimeout(selectNextCard, delay);
    },
    [selectNextCard],
  );

  const markCorrect = useCallback(
    async (card: Card) => {
      await updateProgressForCard(card, (entry) => {
        const nextEntry = { ...entry, correctCount: entry.correctCount + 1 };
        if (nextEntry.stage === 0) {
          nextEntry.stage = 1;
          nextEntry.nextReview = Date.now() + REVIEW_1_DELAY;
        } else if (nextEntry.stage === 1) {
          nextEntry.stage = 2;
          nextEntry.nextReview = Date.now() + REVIEW_2_DELAY;
        } else if (nextEntry.stage === 2) {
          nextEntry.stage = 3;
          nextEntry.nextReview = 0;
        }
        return nextEntry;
      });
      setResult("✅ Correct");
      setResultClass("correct");
      scheduleNextCard(1500);
    },
    [scheduleNextCard, updateProgressForCard],
  );

  const markWrong = useCallback(
    async (card: Card) => {
      const nextAttempts = wrongAttemptsRef.current + 1;
      wrongAttemptsRef.current = nextAttempts;
      setWrongAttempts(nextAttempts);
      await updateProgressForCard(card, (entry) => ({
        ...entry,
        stage: entry.stage > 0 ? entry.stage - 1 : entry.stage,
        nextReview: Date.now(),
      }));

      if (nextAttempts >= MAX_WRONG_ATTEMPTS) {
        skippedCardsRef.current.add(card.text);
        setResult(`❌ Wrong - correct answer: ${getAnswerText(card)}`);
        setResultClass("wrong");
        setRecognizedText("Moving to another card...");
        setSkipEnabled(false);
        scheduleNextCard(5000);
        return;
      }

      setResult("❌ Wrong");
      setResultClass("wrong");
      setRecognizedText(
        listeningRef.current
          ? `🎤 Listening... (${getAttemptsText(nextAttempts)})`
          : `Press Start Listening - ${getAttemptsText(nextAttempts)}`,
      );
    },
    [scheduleNextCard, updateProgressForCard],
  );

  const checkAnswerRef = useRef<(text: string) => void>(() => undefined);
  checkAnswerRef.current = (text: string) => {
    const card = currentCardRef.current;
    if (!card) return;

    const answers = (
      Array.isArray(card.answers) && card.answers.length
        ? card.answers
        : [card.text]
    ).map(normalizeAnswer);
    if (answers.includes(normalizeAnswer(text))) {
      markCorrect(card);
    } else {
      markWrong(card);
    }
  };

  useEffect(() => {
    const recognition = createSpeechRecognition();
    recognitionRef.current = recognition;
    setSpeechSupported(Boolean(recognition));

    if (!recognition) {
      setRecognizedText("Speech recognition not supported");
      return;
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setRecognizedText(`You said: ${transcript}`);
      checkAnswerRef.current(transcript);
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      console.log("Speech error:", event.error);
      setRecognizedText(`Error: ${event.error}`);
    };
    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          // Browser may throw if recognition is already running.
        }
      }
    };

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // Ignore shutdown errors.
      }
    };
  }, []);

  useEffect(() => {
    progressRef.current = progress;
    cardsRef.current = cards;
    currentCardRef.current = currentCard;
    listeningRef.current = listening;
    wrongAttemptsRef.current = wrongAttempts;
  }, [cards, currentCard, listening, progress, wrongAttempts]);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (screen !== "learn" || currentCard) return;
    if (nextDueTimestamp !== null && nextDueTimestamp <= now) {
      selectNextCard();
    }
  }, [currentCard, nextDueTimestamp, now, screen, selectNextCard]);

  const startLearningSession = () => {
    setResult("");
    setRecognizedText("");
    skippedCardsRef.current.clear();
    window.setTimeout(selectNextCard, 0);
  };

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setListening(true);
    setRecognizedText(`🎤 Listening... (${getAttemptsText(wrongAttempts)})`);
    try {
      recognition.start();
    } catch {
      // Ignore duplicate start calls.
    }
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
      setRecognizedText(
        `Press Start Listening - ${getAttemptsText(wrongAttempts)}`,
      );
    } else {
      startListening();
    }
  };

  const repeatCurrentCard = () => {
    if (currentCard) speakWord(currentCard.text);
  };

  const skipCurrentCard = async () => {
    if (!currentCard) return;
    await updateProgressForCard(currentCard, (entry) => ({
      ...entry,
      stage: entry.stage > 0 ? entry.stage - 1 : entry.stage,
      nextReview: Date.now(),
    }));
    skippedCardsRef.current.add(currentCard.text);
    setResult(`⏭ Skipped - correct answer: ${getAnswerText(currentCard)}`);
    setResultClass("skipped");
    setSkipEnabled(false);
    setRecognizedText("Moving to another card...");
    scheduleNextCard(5000);
  };

  return {
    listening,
    recognizedText,
    repeatCurrentCard,
    result,
    resultClass,
    skipCurrentCard,
    skipEnabled,
    speechSupported,
    startLearningSession,
    stopListening,
    toggleListening,
  };
}
