import { ChangeEvent, RefObject } from "react";
import type { CardsetOption } from "../types";

type HomeScreenProps = {
  cardsetOptions: CardsetOption[];
  completePercent: number;
  currentSet: string;
  importCardsetInputRef: RefObject<HTMLInputElement | null>;
  isDefaultSet: boolean;
  nextReviewLabel: string;
  onCardsetImport: (event: ChangeEvent<HTMLInputElement>) => void;
  onDeleteCardset: () => void;
  onExportCardset: () => void;
  onOpenAnalytics: () => void;
  onSetChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onStartLearning: () => void;
};

export function HomeScreen({
  cardsetOptions,
  completePercent,
  currentSet,
  importCardsetInputRef,
  isDefaultSet,
  nextReviewLabel,
  onCardsetImport,
  onDeleteCardset,
  onExportCardset,
  onOpenAnalytics,
  onSetChange,
  onStartLearning,
}: HomeScreenProps) {
  return (
    <section className="screen active">
      <div className="card">
        <h2>Choose Card Set</h2>
        <select value={currentSet} onChange={onSetChange}>
          {cardsetOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="button-group cardset-actions">
          <button className="secondary" onClick={onExportCardset}>
            📦 Export Cardset
          </button>
          <button
            className="secondary"
            onClick={() => importCardsetInputRef.current?.click()}
          >
            📤 Import Cardset
          </button>
          <button
            className="danger"
            disabled={isDefaultSet}
            onClick={onDeleteCardset}
          >
            🗑 Delete Cardset
          </button>
          <input
            ref={importCardsetInputRef}
            type="file"
            hidden
            accept=".csv"
            onChange={onCardsetImport}
          />
        </div>
      </div>

      <div className="card">
        <div className="progress-header">
          <h2>Your Progress</h2>
          <button className="analytics-btn" onClick={onOpenAnalytics}>
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
        <button onClick={onStartLearning}>▶ Continue Learning</button>
      </div>
    </section>
  );
}
