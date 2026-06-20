import { useCallback } from "react";
import {
  getProgressFromDB,
  initializeCardSet,
  setProgressToDB,
} from "../cardData";
import { useAppStore } from "../store/useAppStore";
import { initializeMissingProgress } from "../utils/cardProgress";

export function useFlashCardData() {
  const setCards = useAppStore((state) => state.setCards);
  const setProgress = useAppStore((state) => state.setProgress);

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

  return {
    loadSetData,
  };
}
