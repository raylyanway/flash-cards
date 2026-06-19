import type { Card, ProgressMap } from "../types";
import { getStageName } from "../utils/cardProgress";

type LearnScreenProps = {
  cardsLength: number;
  currentCard: Card | null;
  learnedCount: number;
  listening: boolean;
  progress: ProgressMap;
  recognizedText: string;
  result: string;
  resultClass: string;
  skipEnabled: boolean;
  speechSupported: boolean;
  waitingMessage: string;
  onBackHome: () => void;
  onRepeat: () => void;
  onSkip: () => void;
  onToggleListening: () => void;
};

export function LearnScreen({
  cardsLength,
  currentCard,
  learnedCount,
  listening,
  progress,
  recognizedText,
  result,
  resultClass,
  skipEnabled,
  speechSupported,
  waitingMessage,
  onBackHome,
  onRepeat,
  onSkip,
  onToggleListening,
}: LearnScreenProps) {
  return (
    <section className={`screen active ${currentCard ? "" : "waiting"}`}>
      <div className="top-bar">
        <button onClick={onBackHome}>← Home</button>
        <div id="learnProgress">
          {learnedCount} / {cardsLength} learned
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
        {currentCard ? recognizedText : waitingMessage}
      </div>
      <div id="result" className={resultClass}>
        {result}
      </div>

      <div className="actions">
        <button
          className={listening ? "listening" : ""}
          disabled={!speechSupported || !currentCard}
          onClick={onToggleListening}
        >
          {listening ? "⏹ Stop Listening" : "🎤 Start Listening"}
        </button>
        <button disabled={!currentCard} onClick={onRepeat}>
          🔊 Repeat
        </button>
        <button disabled={!currentCard || !skipEnabled} onClick={onSkip}>
          ⏭ Skip
        </button>
      </div>
    </section>
  );
}
