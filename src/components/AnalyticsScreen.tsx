import type { Card, ProgressMap } from "../types";
import {
  getAnswerText,
  getStageClass,
  getStageName,
} from "../utils/cardProgress";

type AnalyticsScreenProps = {
  cards: Card[];
  learnedCount: number;
  newCount: number;
  progress: ProgressMap;
  review1Count: number;
  review2Count: number;
  onBackHome: () => void;
  onOpenProgressSetup: () => void;
  onResetProgress: () => void;
};

export function AnalyticsScreen({
  cards,
  learnedCount,
  newCount,
  progress,
  review1Count,
  review2Count,
  onBackHome,
  onOpenProgressSetup,
  onResetProgress,
}: AnalyticsScreenProps) {
  const sortedCards = [...cards].sort((a, b) => a.text.localeCompare(b.text));

  return (
    <section className="screen active">
      <div className="top-bar">
        <button onClick={onBackHome}>← Home</button>
        <h2>Analytics</h2>
      </div>

      <div className="card">
        <div className="stats-grid">
          <div className="stat">
            <div>{learnedCount}</div>
            <span>Learned</span>
          </div>
          <div className="stat">
            <div>{review2Count}</div>
            <span>Repeat x2</span>
          </div>
          <div className="stat">
            <div>{review1Count}</div>
            <span>Repeat x1</span>
          </div>
          <div className="stat">
            <div>{newCount}</div>
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
        <button className="danger" onClick={onResetProgress}>
          🔄 Reset Progress
        </button>
        <button className="secondary" onClick={onOpenProgressSetup}>
          ⚙️ Setup Progress
        </button>
      </div>
    </section>
  );
}
