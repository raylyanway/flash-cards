import { ChangeEvent, useEffect, useMemo, useRef } from "react";
import {
  DEFAULT_CARDSETS,
  createCsvFromCards,
  createCsvFromProgress,
  deleteAppDatabase,
  deleteCardset,
  getAllCardsForSet,
  getCardsetBaseName,
  getCardsetDisplayName,
  getCardsetOptions,
  getDisplayNameForSet,
  getUniqueCardsetNames,
  importCardset,
  parseCsvToJson,
  setCachedDataVersion,
  setCardsetMetadata,
  setSettingsToDB,
} from "../cardData";
import { AnalyticsScreen } from "./AnalyticsScreen";
import { AppHeader } from "./AppHeader";
import { HomeScreen } from "./HomeScreen";
import { LearnScreen } from "./LearnScreen";
import { ProgressSetupScreen } from "./ProgressSetupScreen";
import { SettingsScreen } from "./SettingsScreen";
import { useFlashCardData } from "../hooks/useFlashCardData";
import { useLearningSession } from "../hooks/useLearningSession";
import { useAppStore } from "../store/useAppStore";
import type { Card, ProgressMap } from "../types";
import {
  countStages,
  getCompletePercent,
  getNextDueTimestamp,
  getNextReviewLabel,
  initializeMissingProgress,
} from "../utils/cardProgress";
import { downloadCsv } from "../utils/downloadCsv";

export function AppContent() {
  const importCardsetInputRef = useRef<HTMLInputElement | null>(null);
  const importProgressInputRef = useRef<HTMLInputElement | null>(null);

  const cards = useAppStore((state) => state.cards);
  const cardsetOptions = useAppStore((state) => state.cardsetOptions);
  const currentCard = useAppStore((state) => state.currentCard);
  const now = useAppStore((state) => state.now);
  const progressSearch = useAppStore((state) => state.progressSearch);
  const screen = useAppStore((state) => state.screen);
  const setupBackup = useAppStore((state) => state.setupBackup);
  const currentSet = useAppStore((state) => state.currentSet);
  const progress = useAppStore((state) => state.progress);
  const theme = useAppStore((state) => state.theme);

  const setNow = useAppStore((state) => state.setNow);
  const setProgressSearch = useAppStore((state) => state.setProgressSearch);
  const setScreen = useAppStore((state) => state.setScreen);
  const setSetupBackup = useAppStore((state) => state.setSetupBackup);
  const setCardsetOptions = useAppStore((state) => state.setCardsetOptions);
  const setCurrentSet = useAppStore((state) => state.setCurrentSet);
  const setProgress = useAppStore((state) => state.setProgress);

  const {
    loadSetData,
    refreshCardsetOptions,
    saveProgress,
    handleSetChange,
    handleThemeChange,
  } = useFlashCardData();

  const stageCounts = useMemo(() => countStages(progress), [progress]);
  const completePercent = useMemo(
    () => getCompletePercent(cards, progress),
    [cards, progress],
  );
  const nextDueTimestamp = useMemo(
    () => getNextDueTimestamp(cards, progress),
    [cards, progress],
  );
  const nextReviewLabel = useMemo(
    () => getNextReviewLabel(progress, now),
    [now, progress],
  );

  const learning = useLearningSession({
    nextDueTimestamp,
    saveProgress,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleDeleteDatabase = async () => {
    const confirmed = confirm(
      "Delete the saved app database? This will remove all stored progress and cardset data in IndexedDB.",
    );
    if (!confirmed) return;

    try {
      await deleteAppDatabase();
      await setCachedDataVersion(0);
      alert(
        "App database deleted. The app will reload to recreate fresh storage.",
      );
      location.reload();
    } catch (error) {
      console.error("Unable to delete database:", error);
      alert("Could not delete the database. Close other tabs and try again.");
    }
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
    if (DEFAULT_CARDSETS.some((item) => item.key === currentSet)) {
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

  const resetProgress = async () => {
    if (!confirm(`Reset progress for "${currentSet}"?`)) return;
    const nextProgress = initializeMissingProgress(cards, {});
    await saveProgress(nextProgress);
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

  const openProgressSetup = () => {
    setSetupBackup(progress);
    setProgressSearch("");
    setScreen("progressSetup");
  };

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

  const startLearningSession = () => {
    setScreen("learn");
    learning.startLearningSession();
  };

  const goHomeFromLearning = () => {
    learning.stopListening();
    setScreen("home");
  };

  const waitingMessage =
    nextDueTimestamp === null
      ? "All cards learned 🎉"
      : `⏳ Next review in ${Math.max(
          0,
          Math.ceil((nextDueTimestamp - now) / 1000),
        )} sec`;
  const isDefaultSet = DEFAULT_CARDSETS.some((item) => item.key === currentSet);

  return (
    <>
      <AppHeader onOpenSettings={() => setScreen("settings")} />

      {screen === "home" && (
        <HomeScreen
          cardsetOptions={cardsetOptions}
          completePercent={completePercent}
          currentSet={currentSet}
          importCardsetInputRef={importCardsetInputRef}
          isDefaultSet={isDefaultSet}
          nextReviewLabel={nextReviewLabel}
          onCardsetImport={handleImportCardset}
          onDeleteCardset={handleDeleteCardset}
          onExportCardset={exportCardset}
          onOpenAnalytics={() => setScreen("analytics")}
          onSetChange={handleSetChange}
          onStartLearning={startLearningSession}
        />
      )}

      {screen === "learn" && (
        <LearnScreen
          cardsLength={cards.length}
          currentCard={currentCard}
          learnedCount={stageCounts.learnedCount}
          listening={learning.listening}
          progress={progress}
          recognizedText={learning.recognizedText}
          result={learning.result}
          resultClass={learning.resultClass}
          skipEnabled={learning.skipEnabled}
          speechSupported={learning.speechSupported}
          waitingMessage={waitingMessage}
          onBackHome={goHomeFromLearning}
          onRepeat={learning.repeatCurrentCard}
          onSkip={learning.skipCurrentCard}
          onToggleListening={learning.toggleListening}
        />
      )}

      {screen === "analytics" && (
        <AnalyticsScreen
          cards={cards}
          learnedCount={stageCounts.learnedCount}
          newCount={stageCounts.newCount}
          progress={progress}
          review1Count={stageCounts.review1Count}
          review2Count={stageCounts.review2Count}
          onBackHome={goHomeFromLearning}
          onOpenProgressSetup={openProgressSetup}
          onResetProgress={resetProgress}
        />
      )}

      {screen === "settings" && (
        <SettingsScreen
          theme={theme}
          onBackHome={() => setScreen("home")}
          onDeleteDatabase={handleDeleteDatabase}
          onThemeChange={handleThemeChange}
        />
      )}

      {screen === "progressSetup" && (
        <ProgressSetupScreen
          cards={cards}
          importProgressInputRef={importProgressInputRef}
          progress={progress}
          progressSearch={progressSearch}
          onBack={closeProgressSetup}
          onDone={doneProgressSetup}
          onExportProgress={exportProgress}
          onImportProgress={handleImportProgress}
          onSearchChange={setProgressSearch}
          onSetAllStages={setAllStages}
          onSetCardStage={setCardStage}
        />
      )}
    </>
  );
}
