import { ChangeEvent, useRef } from "react";
import { createCsvFromProgress, parseCsvToJson } from "../cardData";
import { useFlashCardData } from "../hooks/useFlashCardData";
import { useAppStore } from "../store/useAppStore";
import type { Card, ProgressMap } from "../types";
import { getStageName, initializeMissingProgress } from "../utils/cardProgress";
import { downloadCsv } from "../utils/downloadCsv";

export function ProgressSetupScreen() {
  const importProgressInputRef = useRef<HTMLInputElement | null>(null);

  const cards = useAppStore((state) => state.cards);
  const currentSet = useAppStore((state) => state.currentSet);
  const progress = useAppStore((state) => state.progress);
  const progressSearch = useAppStore((state) => state.progressSearch);
  const setupBackup = useAppStore((state) => state.setupBackup);

  const setProgress = useAppStore((state) => state.setProgress);
  const setProgressSearch = useAppStore((state) => state.setProgressSearch);
  const setScreen = useAppStore((state) => state.setScreen);
  const setSetupBackup = useAppStore((state) => state.setSetupBackup);

  const { saveProgress } = useFlashCardData();

  const filteredCards = cards.filter((card) =>
    card.text.toLowerCase().includes(progressSearch.toLowerCase()),
  );

  const closeProgressSetup = () => {
    if (setupBackup) {
      setProgress(setupBackup);
      setSetupBackup(null);
    }
    setScreen("analytics");
  };

  const doneProgressSetup = async () => {
    await saveProgress(progress);
    setSetupBackup(null);
    setScreen("analytics");
  };

  const exportProgress = () => {
    if (!cards.length) {
      alert("Nothing to export for this cardset.");
      return;
    }
    downloadCsv(
      createCsvFromProgress(progress, cards),
      `${currentSet}-progress-${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  const handleImportProgress = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a .csv file only.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const data = parseCsvToJson(String(loadEvent.target?.result || ""));
        const importedProgress: ProgressMap = {};
        for (const row of data) {
          const text = String(row.text || "").trim();
          if (!text) continue;
          importedProgress[text] = {
            stage: Number(row.stage) || 0,
            nextReview: Number(row.nextReview) || 0,
            correctCount: Number(row.correctCount) || 0,
          };
        }

        if (Object.keys(importedProgress).length === 0) {
          throw new Error("No valid progress rows found.");
        }

        const confirmed = confirm(
          `Import progress for "${currentSet}"? This will overwrite progress for matching cards.`,
        );
        if (!confirmed) return;

        const nextProgress = initializeMissingProgress(cards, {
          ...progress,
          ...importedProgress,
        });
        await saveProgress(nextProgress);
        alert("Progress imported successfully!");
      } catch (error) {
        alert(`Failed to import progress: ${(error as Error).message}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const setAllStages = (stage: number) => {
    const nextProgress: ProgressMap = {};
    for (const card of cards) {
      nextProgress[card.text] = {
        stage,
        nextReview: 0,
        correctCount: stage === 3 ? 3 : 0,
      };
    }
    setProgress(nextProgress);
  };

  const setCardStage = (card: Card, stage: number) => {
    setProgress({
      ...progress,
      [card.text]: {
        ...progress[card.text],
        stage,
        nextReview: 0,
        correctCount:
          stage === 3
            ? Math.max(progress[card.text]?.correctCount || 0, 3)
            : progress[card.text]?.correctCount || 0,
      },
    });
  };

  return (
    <section className="screen active">
      <div className="top-bar">
        <button onClick={closeProgressSetup}>← Back</button>
        <h2>Setup Progress</h2>
      </div>

      <div className="card">
        <div className="setup-section">
          <h3>Bulk Operations</h3>
          <div className="button-group">
            <button className="secondary" onClick={() => setAllStages(0)}>
              Mark All as New
            </button>
            <button className="secondary" onClick={() => setAllStages(1)}>
              Mark All as Learning
            </button>
            <button className="secondary" onClick={() => setAllStages(3)}>
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
            onChange={(event) => setProgressSearch(event.target.value)}
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
                        setCardStage(card, Number(event.target.value))
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
            <button className="secondary" onClick={exportProgress}>
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
              onChange={handleImportProgress}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary" onClick={doneProgressSetup}>
            Done
          </button>
        </div>
      </div>
    </section>
  );
}
