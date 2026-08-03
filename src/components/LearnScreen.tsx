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
  // const setScreen = useAppStore((state) => state.setScreen);

  const stageCounts = useMemo(() => countStages(progress), [progress]);
  const nextDueTimestamp = useMemo(
    () => getNextDueTimestamp(cards, progress),
    [cards, progress],
  );
  const learning = useLearningSession({
    nextDueTimestamp,
  });

  useEffect(() => {
    learning.startLearningSession();
  }, []);

  // const goHome = () => {
  //   learning.stopListening();
  //   setScreen("home");
  // };

  const waitingMessage =
    nextDueTimestamp === null
      ? "All cards learned 🎉"
      : `⏳ Next review in ${Math.max(
          0,
          Math.ceil((nextDueTimestamp - now) / 1000),
        )} sec`;

  return (
    <section className={`screen active ${currentCard ? "" : "waiting"}`}>
      <div className="top-bar">
        <div id="learnProgress">
          {stageCounts.learnedCount} / {cards.length} learned
        </div>
      </div>

      <div className="card learn-card">
        <div id="text">{currentCard?.text || "🎉 Great job!"}</div>
        <div id="cardStatus">
          {currentCard
            ? getStageName(progress[currentCard.text]?.stage || 0)
            : "No cards are due"}
        </div>
      </div>

      <div id="recognizedText">
        {currentCard ? learning.recognizedText : waitingMessage}
      </div>
      <div id="result" className={learning.resultClass}>
        {learning.result}
      </div>

      <div className="actions">
        <button
          className={learning.listening ? "listening" : ""}
          disabled={!learning.speechSupported || !currentCard}
          onClick={learning.toggleListening}
        >
          {learning.listening ? "⏹ Stop Listening" : "🎤 Start Listening"}
        </button>
        <button disabled={!currentCard} onClick={learning.repeatCurrentCard}>
          🔊 Repeat
        </button>
        <button
          disabled={!currentCard || !learning.skipEnabled}
          onClick={learning.skipCurrentCard}
        >
          ⏭ Skip
        </button>
      </div>
    </section>
  );
}
