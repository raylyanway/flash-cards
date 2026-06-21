import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { getCompletePercent, getNextReviewLabel } from "../utils/cardProgress";
import "./HomeScreen.css";

export function HomeScreen() {
  const cards = useAppStore((state) => state.cards);
  const currentSet = useAppStore((state) => state.currentSet);
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

  const totalCards = cards.length;
  const learnedCount = useMemo(
    () => Object.values(progress).filter((p) => p.stage === 3).length,
    [progress],
  );

  const dueCount = useMemo(() => {
    const nowTs = Date.now();
    return Object.values(progress).filter(
      (p) => p.stage < 3 && p.nextReview <= nowTs,
    ).length;
  }, [progress, now]);

  return (
    <section className="screen active home-screen">
      <div className="welcome-header">
        <div className="greeting">
          <span className="emoji">🎯</span>
          <h1>Keep going!</h1>
        </div>
        <div className="current-set">
          <span className="set-label">Current set:</span>
          <strong>{currentSet}</strong>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="card progress-overview">
        <div className="progress-circle-container">
          <div className="progress-circle">
            <svg viewBox="0 0 120 120" className="progress-svg">
              <circle className="progress-bg" cx="60" cy="60" r="52" />
              <circle
                className="progress-ring"
                cx="60"
                cy="60"
                r="52"
                strokeDasharray={`${completePercent * 3.27} 327`}
                strokeDashoffset="0"
              />
            </svg>
            <div className="progress-center">
              <div className="progress-number">{completePercent}%</div>
              <div className="progress-label">Mastered</div>
            </div>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-item">
            <div className="stat-value">{totalCards}</div>
            <div className="stat-name">Total Cards</div>
          </div>
          <div className="stat-item">
            <div className="stat-value highlight">{learnedCount}</div>
            <div className="stat-name">Learned</div>
          </div>
          <div className="stat-item">
            <div className="stat-value due">{dueCount}</div>
            <div className="stat-name">Due Now</div>
          </div>
        </div>

        <div className="next-review">
          <span className="clock">⏰</span>
          <span>Next review: </span>
          <strong>{nextReviewLabel}</strong>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="actions home-actions">
        <button className="primary big-btn" onClick={() => setScreen("learn")}>
          ▶️ Continue Learning
        </button>

        <div className="action-grid">
          <button className="secondary" onClick={() => setScreen("cardSet")}>
            📚 Change Set
          </button>
          <button className="secondary" onClick={() => setScreen("analytics")}>
            📊 Analytics
          </button>
        </div>
      </div>

      {/* Motivational footer */}
      {completePercent > 70 && (
        <div className="motivation">
          You're doing amazing! Keep building that streak 🔥
        </div>
      )}
    </section>
  );
}
