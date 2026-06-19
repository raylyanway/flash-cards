import { ChangeEvent, useCallback, useEffect } from "react";
import {
  getCardsetOptions,
  getProgressFromDB,
  getSettingsFromDB,
  initializeCardSet,
  setProgressToDB,
  setSettingsToDB,
} from "../cardData";
import { useAppStore } from "../store/useAppStore";
import type { ProgressMap, ThemePreference } from "../types";
import { initializeMissingProgress } from "../utils/cardProgress";

const DEFAULT_THEME: ThemePreference = "system";
const DEFAULT_SET = "body-parts";

export function useFlashCardData() {
  const cards = useAppStore((state) => state.cards);
  const cardsetOptions = useAppStore((state) => state.cardsetOptions);
  const currentSet = useAppStore((state) => state.currentSet);
  const progress = useAppStore((state) => state.progress);
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
    async (preferredSet = currentSet) => {
      const options = await getCardsetOptions();
      setCardsetOptions(options);
      if (
        !options.some((option) => option.key === preferredSet) &&
        options[0]
      ) {
        setCurrentSet(options[0].key);
      }
      return options;
    },
    [currentSet],
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

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const settings = await getSettingsFromDB();
      if (!mounted) return;

      const savedSet = settings.currentSet || DEFAULT_SET;
      const savedTheme = settings.theme || DEFAULT_THEME;
      setCurrentSet(savedSet);
      setTheme(savedTheme);
      await refreshCardsetOptions(savedSet);
      await loadSetData(savedSet);
    }

    boot().catch((error) => {
      console.error("Failed to initialize app:", error);
    });

    return () => {
      mounted = false;
    };
  }, [loadSetData, refreshCardsetOptions]);

  useEffect(() => {
    document.body.classList.remove("theme-system", "theme-light", "theme-dark");
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

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
    cards,
    cardsetOptions,
    currentSet,
    loadSetData,
    progress,
    refreshCardsetOptions,
    saveProgress,
    setCardsetOptions,
    setCurrentSet,
    setProgress,
    theme,
    handleSetChange,
    handleThemeChange,
  };
}
