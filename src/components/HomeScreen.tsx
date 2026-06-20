import { useMemo } from "react";

import { useAppStore } from "../store/useAppStore";
import { getCompletePercent, getNextReviewLabel } from "../utils/cardProgress";

export function HomeScreen() {
  const cards = useAppStore((state) => state.cards);
  const now = useAppStore((state) => state.now);
  const progress = useAppStore((state) => state.progress);

  const setScreen = useAppStore((state) => state.setScreen);

  const completePercent = useMemo(
    () => getCompletePercent(cards, progress),
    [cards, progress],
  );

  const nextReviewLabel = useMemo(
    () => getNextReviewLabel(progress, now),
    [now, progress],
  );

  return (
    <section className="screen active">
      <button onClick={() => setScreen("cardSet")}>Choose cardSet</button>

      <div className="card">
        <div className="progress-header">
          <h2>Your Progress</h2>
          <button
            className="analytics-btn"
            onClick={() => setScreen("analytics")}
          >
            📊 Analytics
          </button>
        </div>
        <div className="progress-bar">
          <div id="progressFill" style={{ width: `${completePercent}%` }} />
        </div>
        <div id="progressText">{completePercent}% Complete</div>
        <div id="nextReviewBox">
          Next review: <span>{nextReviewLabel}</span>
        </div>
      </div>

      <div className="actions">
        <button onClick={() => setScreen("learn")}>▶ Continue Learning</button>
      </div>
    </section>
  );
}
