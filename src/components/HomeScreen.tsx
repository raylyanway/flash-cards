import { ChangeEvent, useMemo, useRef } from "react";
import {
  DEFAULT_CARDSETS,
  createCsvFromCards,
  deleteCardset,
  getAllCardsForSet,
  getCardsetBaseName,
  getCardsetDisplayName,
  getCardsetOptions,
  getDisplayNameForSet,
  getUniqueCardsetNames,
  importCardset,
  parseCsvToJson,
  setCardsetMetadata,
  setSettingsToDB,
} from "../cardData";
import { useFlashCardData } from "../hooks/useFlashCardData";
import { useAppStore } from "../store/useAppStore";
import { getCompletePercent, getNextReviewLabel } from "../utils/cardProgress";
import { downloadCsv } from "../utils/downloadCsv";

export function HomeScreen() {
  const importCardsetInputRef = useRef<HTMLInputElement | null>(null);

  const cards = useAppStore((state) => state.cards);
  const cardsetOptions = useAppStore((state) => state.cardsetOptions);
  const currentSet = useAppStore((state) => state.currentSet);
  const now = useAppStore((state) => state.now);
  const progress = useAppStore((state) => state.progress);
  const theme = useAppStore((state) => state.theme);

  const setCardsetOptions = useAppStore((state) => state.setCardsetOptions);
  const setCurrentSet = useAppStore((state) => state.setCurrentSet);
  const setScreen = useAppStore((state) => state.setScreen);
  const refreshCardsetOptions = useAppStore(
    (state) => state.refreshCardsetOptions,
  );

  const { loadSetData } = useFlashCardData();

  const completePercent = useMemo(
    () => getCompletePercent(cards, progress),
    [cards, progress],
  );
  const nextReviewLabel = useMemo(
    () => getNextReviewLabel(progress, now),
    [now, progress],
  );
  const isDefaultSet = DEFAULT_CARDSETS.some((item) => item.key === currentSet);

  const exportCardset = async () => {
    try {
      const allCards = await getAllCardsForSet(currentSet);
      if (!allCards.length) {
        alert("Nothing to export for this cardset.");
        return;
      }
      downloadCsv(
        createCsvFromCards(
          allCards.map((card) => {
            const exportedCard = { ...card };
            delete exportedCard.setName;
            return exportedCard;
          }),
        ),
        `${currentSet}.csv`,
      );
    } catch (error) {
      console.error("exportCardset failed:", error);
      alert("Unable to export cardset. See console for details.");
    }
  };

  const handleImportCardset = (event: ChangeEvent<HTMLInputElement>) => {
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
        const setName = getCardsetBaseName(file.name);
        if (!setName) {
          throw new Error(
            "Unable to infer cardset name from the uploaded file name.",
          );
        }

        const existing = await getUniqueCardsetNames();
        if (existing.includes(setName)) {
          const confirmed = confirm(
            `A cardset named "${setName}" already exists. Overwrite it?`,
          );
          if (!confirmed) return;
        }

        const displayName = getDisplayNameForSet(setName);
        await importCardset(setName, data);
        await setCardsetMetadata({
          setName,
          displayName,
          importedAt: Date.now(),
        });
        await refreshCardsetOptions(setName);
        setCurrentSet(setName);
        await setSettingsToDB({ currentSet: setName, theme });
        await loadSetData(setName);
        alert(`Cardset "${displayName}" imported successfully.`);
      } catch (error) {
        alert(`Failed to import cardset: ${(error as Error).message}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteCardset = async () => {
    if (isDefaultSet) {
      alert("Default cardsets cannot be deleted.");
      return;
    }

    const displayName = await getCardsetDisplayName(currentSet);
    if (
      !confirm(
        `Delete cardset "${displayName}"? This will remove the cardset and its progress.`,
      )
    ) {
      return;
    }

    try {
      await deleteCardset(currentSet);
      const options = await getCardsetOptions();
      const nextSet = options[0]?.key || "body-parts";
      setCardsetOptions(options);
      setCurrentSet(nextSet);
      await setSettingsToDB({ currentSet: nextSet, theme });
      await loadSetData(nextSet);
      alert(`Cardset "${displayName}" deleted.`);
    } catch (error) {
      console.error("Failed to delete cardset:", error);
      alert("Unable to delete cardset. See console for details.");
    }
  };

  const handleSetChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSet = event.target.value;
    setCurrentSet(nextSet);
    await setSettingsToDB({ currentSet: nextSet, theme });
    await loadSetData(nextSet);
  };

  return (
    <section className="screen active">
      <div className="card">
        <h2>Choose Card Set</h2>
        <select value={currentSet} onChange={handleSetChange}>
          {cardsetOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="button-group cardset-actions">
          <button className="secondary" onClick={exportCardset}>
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
            onClick={handleDeleteCardset}
          >
            🗑 Delete Cardset
          </button>
          <input
            ref={importCardsetInputRef}
            type="file"
            hidden
            accept=".csv"
            onChange={handleImportCardset}
          />
        </div>
      </div>

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
