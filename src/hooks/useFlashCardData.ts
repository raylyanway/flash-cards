import { ChangeEvent, useCallback } from "react";
import {
  getProgressFromDB,
  initializeCardSet,
  setProgressToDB,
  setSettingsToDB,
} from "../cardData";
import { useAppStore } from "../store/useAppStore";
import { initializeMissingProgress } from "../utils/cardProgress";

export function useFlashCardData() {
  const setCards = useAppStore((state) => state.setCards);
  const setCurrentSet = useAppStore((state) => state.setCurrentSet);
  const setProgress = useAppStore((state) => state.setProgress);
  const theme = useAppStore((state) => state.theme);

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

  return {
    loadSetData,
    handleSetChange,
  };
}
