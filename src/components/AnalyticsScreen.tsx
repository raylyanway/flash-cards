import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  countStages,
  getAnswerText,
  getStageClass,
  getStageName,
  initializeMissingProgress,
} from "../utils/cardProgress";

export function AnalyticsScreen() {
  const cards = useAppStore((state) => state.cards);
  const currentSet = useAppStore((state) => state.currentSet);
  const progress = useAppStore((state) => state.progress);
  const saveProgress = useAppStore((state) => state.saveProgress);
  const setProgressSearch = useAppStore((state) => state.setProgressSearch);
  const setScreen = useAppStore((state) => state.setScreen);
  const setSetupBackup = useAppStore((state) => state.setSetupBackup);

  const stageCounts = useMemo(() => countStages(progress), [progress]);
  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.text.localeCompare(b.text)),
    [cards],
  );

  const resetProgress = async () => {
    if (!confirm(`Reset progress for "${currentSet}"?`)) return;
    const nextProgress = initializeMissingProgress(cards, {});
    await saveProgress(nextProgress);
  };

  const openProgressSetup = () => {
    setSetupBackup(progress);
    setProgressSearch("");
    setScreen("progressSetup");
  };

  return (
    <section className="screen active">
      <div className="top-bar">
        <button onClick={() => setScreen("home")}>← Home</button>
        <h2>Analytics</h2>
      </div>

      <div className="card">
        <div className="stats-grid">
          <div className="stat">
            <div>{stageCounts.learnedCount}</div>
            <span>Learned</span>
          </div>
          <div className="stat">
            <div>{stageCounts.review2Count}</div>
            <span>Repeat x2</span>
          </div>
          <div className="stat">
            <div>{stageCounts.review1Count}</div>
            <span>Repeat x1</span>
          </div>
          <div className="stat">
            <div>{stageCounts.newCount}</div>
            <span>New</span>
          </div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Text</th>
              <th>Status</th>
              <th>Correct Answer</th>
            </tr>
          </thead>
          <tbody>
            {sortedCards.map((card) => {
              const cardProgress = progress[card.text] || { stage: 0 };
              return (
                <tr key={card.text}>
                  <td>{card.text}</td>
                  <td className={getStageClass(cardProgress.stage)}>
                    {getStageName(cardProgress.stage)}
                  </td>
                  <td>{getAnswerText(card)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="actions">
        <button className="danger" onClick={resetProgress}>
          🔄 Reset Progress
        </button>
        <button className="secondary" onClick={openProgressSetup}>
          ⚙️ Setup Progress
        </button>
      </div>
    </section>
  );
}
