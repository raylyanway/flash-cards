import { ChangeEvent, useCallback } from "react";
import {
  getCardsetOptions,
  getProgressFromDB,
  initializeCardSet,
  setProgressToDB,
  setSettingsToDB,
} from "../cardData";
import { useAppStore } from "../store/useAppStore";
import type { ProgressMap, ThemePreference } from "../types";
import { initializeMissingProgress } from "../utils/cardProgress";

export function useFlashCardData() {
  const currentSet = useAppStore((state) => state.currentSet);
  const setCards = useAppStore((state) => state.setCards);
  const setCardsetOptions = useAppStore((state) => state.setCardsetOptions);
  const setCurrentSet = useAppStore((state) => state.setCurrentSet);
  const setProgress = useAppStore((state) => state.setProgress);
  const setTheme = useAppStore((state) => state.setTheme);
  const theme = useAppStore((state) => state.theme);

  const saveProgress = useCallback(
    async (nextProgress: ProgressMap) => {
      setProgress(nextProgress);
      await setProgressToDB(currentSet, nextProgress);
    },
    [currentSet],
  );

  const refreshCardsetOptions = useCallback(
    async (preferredSet?: string) => {
      const targetSet = preferredSet || currentSet;
      const options = await getCardsetOptions();
      setCardsetOptions(options);
      if (!options.some((option) => option.key === targetSet) && options[0]) {
        setCurrentSet(options[0].key);
      }
      return options;
    },
    [setCardsetOptions, setCurrentSet, currentSet],
  );

  const loadSetData = useCallback(async (setName: string) => {
    const [storedProgress, loadedCards] = await Promise.all([
      getProgressFromDB(setName),
      initializeCardSet(setName),
    ]);
    const nextProgress = initializeMissingProgress(
      loadedCards,
      storedProgress || {},
    );
    setCards(loadedCards);
    setProgress(nextProgress);
    await setProgressToDB(setName, nextProgress);
  }, []);

  const handleSetChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSet = event.target.value;
    setCurrentSet(nextSet);
    await setSettingsToDB({ currentSet: nextSet, theme });
    await loadSetData(nextSet);
  };

  const handleThemeChange = async (nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    await setSettingsToDB({ currentSet, theme: nextTheme });
  };

  return {
    loadSetData,
    refreshCardsetOptions,
    saveProgress,
    handleSetChange,
    handleThemeChange,
  };
}
