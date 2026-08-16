import clsx from "clsx";
import { useMemo } from "react";
import { useAppStore } from "../../store/useAppStore";
import {
  getCompletePercent,
  getNextReviewLabel,
} from "../../utils/cardProgress";
import { Button } from "../button";
import { Card } from "../card";
import { HomeIcon } from "../Icons";
import { PageHeader } from "../pageHeader";
import { Typography } from "../typography";
import s from "./HomeScreen.module.css";

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
    <section className={clsx("active", s.homeScreen)}>
      <PageHeader
        icon={<HomeIcon />}
        eyebrow="Study overview"
        title="Keep your streak alive"
        description="Review what’s due, track your progress, and jump straight back in."
      />

      <Card className={s.selectorCard}>
        <div className={s.selectorCopy}>
          <Typography as="span" variant="label" className={s.fieldLabel}>
            Current set
          </Typography>
          <Typography as="strong" variant="title">
            {currentSet}
          </Typography>
          <Typography as="span" variant="caption">
            {currentSet ? "Learning collection" : "No collection selected"}
          </Typography>
        </div>
      </Card>

      <div className={s.metricsGrid}>
        <Card className={s.overviewCard}>
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

          <div className={s.metricsRow}>
            <div className={s.metricItem}>
              <div className={s.metricValue}>{totalCards}</div>
              <div className={s.metricName}>Cards</div>
            </div>
            <div className={s.metricItem}>
              <div className={clsx(s.metricValue, s.highlight)}>
                {learnedCount}
              </div>
              <div className={s.metricName}>Learned</div>
            </div>
            <div className={s.metricItem}>
              <div className={clsx(s.metricValue, s.due)}>{dueCount}</div>
              <div className={s.metricName}>Due now</div>
            </div>
          </div>
        </Card>

        <Card className={s.insightCard}>
          <Typography as="span" variant="label" className={s.cardLabel}>
            Next review
          </Typography>
          <Typography as="h2" variant="h2">
            {nextReviewLabel}
          </Typography>
          <Typography as="p" variant="subtitle">
            {dueCount > 0
              ? "A few cards are ready for another pass. Keep the momentum going."
              : "You are all caught up for now. A fresh review can still strengthen recall."}
          </Typography>
          <Button className={s.startButton} onClick={() => setScreen("learn")}>
            Start reviewing
          </Button>
        </Card>
      </div>
    </section>
  );
}
