import { create } from "zustand";
import {
  DEFAULT_CARDSETS,
  getCardsetOptions,
  getProgressFromDB,
  getSettingsFromDB,
  initializeCardSet,
  setProgressToDB,
} from "../cardData";
import type {
  Card,
  CardsetOption,
  ProgressMap,
  Screen,
  ThemePreference,
} from "../types";
import { initializeMissingProgress } from "../utils/cardProgress";

const DEFAULT_THEME: ThemePreference = "system";
const DEFAULT_SET = "body-parts";

type AppState = {
  initialized: boolean;
  cardsetOptions: CardsetOption[];
  cards: Card[];
  currentCard: Card | null;
  currentSet: string;
  listening: boolean;
  now: number;
  progress: ProgressMap;
  progressSearch: string;
  recognizedText: string;
  result: string;
  resultClass: string;
  screen: Screen;
  setupBackup: ProgressMap | null;
  skipEnabled: boolean;
  speechSupported: boolean;
  theme: ThemePreference;
  wrongAttempts: number;
};

type AppActions = {
  initialize: () => Promise<void>;
  loadSetData: (setName: string) => Promise<void>;
  refreshCardsetOptions: (preferredSet?: string) => Promise<CardsetOption[]>;
  saveProgress: (progress: ProgressMap) => Promise<void>;
  setCardsetOptions: (options: CardsetOption[]) => void;
  setCards: (cards: Card[]) => void;
  setCurrentCard: (card: Card | null) => void;
  setCurrentSet: (setName: string) => void;
  setListening: (listening: boolean) => void;
  setNow: (now: number) => void;
  setProgress: (progress: ProgressMap) => void;
  setProgressSearch: (search: string) => void;
  setRecognizedText: (text: string) => void;
  setResult: (result: string) => void;
  setResultClass: (resultClass: string) => void;
  setScreen: (screen: Screen) => void;
  setSetupBackup: (progress: ProgressMap | null) => void;
  setSkipEnabled: (enabled: boolean) => void;
  setSpeechSupported: (supported: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  setWrongAttempts: (attempts: number) => void;
};

export type AppStore = AppState & AppActions;

export const useAppStore = create<AppStore>((set, get) => ({
  initialized: false,
  cardsetOptions: DEFAULT_CARDSETS,
  cards: [],
  currentCard: null,
  currentSet: DEFAULT_SET,
  listening: false,
  now: Date.now(),
  progress: {},
  progressSearch: "",
  recognizedText: "Press Start Listening",
  result: "",
  resultClass: "",
  screen: "home",
  setupBackup: null,
  skipEnabled: true,
  speechSupported: false,
  theme: DEFAULT_THEME,
  wrongAttempts: 0,

  initialize: async () => {
    const settings = await getSettingsFromDB();
    const savedSet = settings.currentSet || DEFAULT_SET;
    const cardsetOptions = await get().refreshCardsetOptions(savedSet);

    const setToLoad = cardsetOptions.some((option) => option.key === savedSet)
      ? savedSet
      : cardsetOptions[0]?.key || DEFAULT_SET;

    await get().loadSetData(setToLoad);

    set({
      theme: settings.theme ?? DEFAULT_THEME,
      currentSet: savedSet,
      initialized: true,
    });
  },

  loadSetData: async (setName: string) => {
    const [storedProgress, loadedCards] = await Promise.all([
      getProgressFromDB(setName),
      initializeCardSet(setName),
    ]);
    const nextProgress = initializeMissingProgress(
      loadedCards,
      storedProgress || {},
    );
    set({ cards: loadedCards, progress: nextProgress });
    await setProgressToDB(setName, nextProgress);
  },
  refreshCardsetOptions: async (preferredSet?: string) => {
    const targetSet = preferredSet || get().currentSet;
    const options = await getCardsetOptions();
    set({ cardsetOptions: options });
    if (!options.some((option) => option.key === targetSet) && options[0]) {
      set({ currentSet: options[0].key });
    }
    return options;
  },
  saveProgress: async (progress) => {
    set({ progress });
    await setProgressToDB(get().currentSet, progress);
  },
  setCardsetOptions: (cardsetOptions) => set({ cardsetOptions }),
  setCards: (cards) => set({ cards }),
  setCurrentCard: (currentCard) => set({ currentCard }),
  setCurrentSet: (currentSet) => set({ currentSet }),
  setListening: (listening) => set({ listening }),
  setNow: (now) => set({ now }),
  setProgress: (progress) => set({ progress }),
  setProgressSearch: (progressSearch) => set({ progressSearch }),
  setRecognizedText: (recognizedText) => set({ recognizedText }),
  setResult: (result) => set({ result }),
  setResultClass: (resultClass) => set({ resultClass }),
  setScreen: (screen) => set({ screen }),
  setSetupBackup: (setupBackup) => set({ setupBackup }),
  setSkipEnabled: (skipEnabled) => set({ skipEnabled }),
  setSpeechSupported: (speechSupported) => set({ speechSupported }),
  setTheme: (theme) => set({ theme }),
  setWrongAttempts: (wrongAttempts) => set({ wrongAttempts }),
}));
