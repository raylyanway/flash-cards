import { ChangeEvent, RefObject } from "react";
import type { Card, ProgressMap } from "../types";
import { getStageName } from "../utils/cardProgress";

type ProgressSetupScreenProps = {
  cards: Card[];
  importProgressInputRef: RefObject<HTMLInputElement | null>;
  progress: ProgressMap;
  progressSearch: string;
  onBack: () => void;
  onDone: () => void;
  onExportProgress: () => void;
  onImportProgress: (event: ChangeEvent<HTMLInputElement>) => void;
  onSearchChange: (search: string) => void;
  onSetAllStages: (stage: number) => void;
  onSetCardStage: (card: Card, stage: number) => void;
};

export function ProgressSetupScreen({
  cards,
  importProgressInputRef,
  progress,
  progressSearch,
  onBack,
  onDone,
  onExportProgress,
  onImportProgress,
  onSearchChange,
  onSetAllStages,
  onSetCardStage,
}: ProgressSetupScreenProps) {
  const filteredCards = cards.filter((card) =>
    card.text.toLowerCase().includes(progressSearch.toLowerCase()),
  );

  return (
    <section className="screen active">
      <div className="top-bar">
        <button onClick={onBack}>← Back</button>
        <h2>Setup Progress</h2>
      </div>

      <div className="card">
        <div className="setup-section">
          <h3>Bulk Operations</h3>
          <div className="button-group">
            <button className="secondary" onClick={() => onSetAllStages(0)}>
              Mark All as New
            </button>
            <button className="secondary" onClick={() => onSetAllStages(1)}>
              Mark All as Learning
            </button>
            <button className="secondary" onClick={() => onSetAllStages(3)}>
              Mark All as Learned
            </button>
          </div>
        </div>

        <div className="setup-section">
          <h3>Individual Card Progress</h3>
          <input
            type="text"
            placeholder="Search cards..."
            className="search-input"
            value={progressSearch}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <div className="card-list">
            {filteredCards.map((card) => {
              const cardProgress = progress[card.text] || {
                stage: 0,
                correctCount: 0,
              };
              return (
                <div className="progress-card-item" key={card.text}>
                  <div className="progress-card-info">
                    <div className="progress-card-text">{card.text}</div>
                    <div className="progress-card-status">
                      {getStageName(cardProgress.stage)} -{" "}
                      {cardProgress.correctCount || 0} correct
                    </div>
                  </div>
                  <div className="progress-card-controls">
                    <select
                      value={cardProgress.stage}
                      onChange={(event) =>
                        onSetCardStage(card, Number(event.target.value))
                      }
                    >
                      <option value={0}>New</option>
                      <option value={1}>Learning x1</option>
                      <option value={2}>Learning x2</option>
                      <option value={3}>Learned</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="setup-section">
          <h3>Import / Export Progress</h3>
          <div className="button-group">
            <button className="secondary" onClick={onExportProgress}>
              📥 Export Progress
            </button>
            <button
              className="secondary"
              onClick={() => importProgressInputRef.current?.click()}
            >
              📤 Import Progress
            </button>
            <input
              ref={importProgressInputRef}
              type="file"
              hidden
              accept=".csv"
              onChange={onImportProgress}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary" onClick={onDone}>
            Done
          </button>
        </div>
      </div>
    </section>
  );
}
