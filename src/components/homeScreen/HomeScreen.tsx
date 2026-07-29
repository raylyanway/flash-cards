import clsx from "clsx";
import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import {
  getCompletePercent,
  getNextReviewLabel,
} from "../../utils/cardProgress";
import { SelectedSet } from "../selectedSet";
import s from "./HomeScreen.module.css";

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
    <section className={clsx("screen", "active", s.homeScreen)}>
      <SelectedSet />
      <div className={clsx("card", s.progressOverview)}>
        <div className={s.progressCircleContainer}>
          <div className={s.progressCircle}>
            <svg viewBox="0 0 120 120" className={s.progressSvg}>
              <circle className={s.progressBg} cx="60" cy="60" r="52" />
              <circle
                className={s.progressRing}
                cx="60"
                cy="60"
                r="52"
                strokeDasharray={`${completePercent * 3.27} 327`}
                strokeDashoffset="0"
              />
            </svg>
            <div className={s.progressCenter}>
              <div className={s.progressNumber}>{completePercent}%</div>
              <div className={s.progressLabel}>Mastered</div>
            </div>
          </div>
        </div>

        <div className={s.statsRow}>
          <div className={s.statItem}>
            <div className={s.statValue}>{totalCards}</div>
            <div className={s.statName}>Total Cards</div>
          </div>
          <div className={s.statItem}>
            <div className={clsx(s.statValue, "highlight")}>{learnedCount}</div>
            <div className={s.statName}>Learned</div>
          </div>
          <div className={s.statItem}>
            <div className={clsx(s.statValue, "due")}>{dueCount}</div>
            <div className={s.statName}>Due Now</div>
          </div>
        </div>

        <div className={s.nextReview}>
          <span>⏰</span>
          <span>Next review: </span>
          <strong>{nextReviewLabel}</strong>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={clsx("actions", s.homeActions)}>
        <button className={s.bigBtn} onClick={() => setScreen("learn")}>
          ▶️ Continue Learning
        </button>
      </div>

      {/* Motivational footer */}
      {completePercent > 70 && (
        <div className={s.motivation}>
          You're doing amazing! Keep building that streak 🔥
        </div>
      )}
    </section>
  );
}
