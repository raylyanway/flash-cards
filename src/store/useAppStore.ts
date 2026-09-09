import { del, get, set } from "idb-keyval";
import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import {
  DEFAULT_CONTENT,
  getContentOptions,
  getProgressFromDB,
  initializeContent,
} from "../DB";
import type {
  Card,
  ContentOption,
  ProgressMap,
  SetProgress,
  ThemePreference,
} from "../types";
import { initializeMissingProgress } from "../utils/cardProgress";

const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    console.log(name, "has been retrieved");
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    console.log(name, "with value", value, "has been saved");
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    console.log(name, "has been deleted");
    await del(name);
  },
};

const DEFAULT_THEME: ThemePreference = "system";
const DEFAULT_SET = "body-parts";

export type AppState = {
  _hasHydrated: boolean;
  initialized: boolean;
  contentOptions: ContentOption[];
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
  setupBackup: SetProgress | null;
  skipEnabled: boolean;
  speechSupported: boolean;
  theme: ThemePreference;
  wrongAttempts: number;
  navExpanded: boolean;
};

export type AppActions = {
  initialize: () => Promise<void>;
  loadSetData: (setName: string) => Promise<void>;
  refreshContentOptions: (preferredSet?: string) => Promise<ContentOption[]>;
  setContentOptions: (options: ContentOption[]) => void;
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
  setSetupBackup: (progress: SetProgress | null) => void;
  setSkipEnabled: (enabled: boolean) => void;
  setSpeechSupported: (supported: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  setWrongAttempts: (attempts: number) => void;
  setNavExpanded: (expanded: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
};

export type AppStore = AppState & AppActions;

const DEFAULT_STATE: AppState = {
  _hasHydrated: false,
  initialized: false,
  contentOptions: DEFAULT_CONTENT,
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
  setupBackup: null,
  skipEnabled: true,
  speechSupported: false,
  theme: DEFAULT_THEME,
  wrongAttempts: 0,
  navExpanded: true,
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },

      initialize: async () => {
        const { currentSet } = get();
        const contentOptions = await get().refreshContentOptions(currentSet);

        const setToLoad = contentOptions.some(
          (option) => option.key === currentSet,
        )
          ? currentSet
          : contentOptions[0]?.key || DEFAULT_SET;

        await get().loadSetData(setToLoad);

        set({
          initialized: true,
        });
      },

      loadSetData: async (setName: string) => {
        const [storedProgress, loadedCards] = await Promise.all([
          getProgressFromDB(setName),
          initializeContent(setName),
        ]);
        const nextProgress = initializeMissingProgress(
          loadedCards,
          storedProgress || {},
        );
        set({ cards: loadedCards, progress: nextProgress });
      },

      refreshContentOptions: async (preferredSet?: string) => {
        const targetSet = preferredSet || get().currentSet;
        const options = await getContentOptions();
        set({ contentOptions: options });
        if (!options.some((option) => option.key === targetSet) && options[0]) {
          set({ currentSet: options[0].key });
        }
        return options;
      },

      setContentOptions: (contentOptions) => set({ contentOptions }),
      setCards: (cards) => set({ cards }),
      setCurrentCard: (currentCard) => set({ currentCard }),
      setCurrentSet: (currentSet) => set({ currentSet }),
      setListening: (listening) => set({ listening }),
      setNow: (now) => set({ now }),
      setProgress: (progress) =>
        set((prev) => ({ progress: { ...prev.progress, ...progress } })),
      setProgressSearch: (progressSearch) => set({ progressSearch }),
      setRecognizedText: (recognizedText) => set({ recognizedText }),
      setResult: (result) => set({ result }),
      setResultClass: (resultClass) => set({ resultClass }),
      setSetupBackup: (setupBackup) => set({ setupBackup }),
      setSkipEnabled: (skipEnabled) => set({ skipEnabled }),
      setSpeechSupported: (speechSupported) => set({ speechSupported }),
      setTheme: (theme) => set({ theme }),
      setWrongAttempts: (wrongAttempts) => set({ wrongAttempts }),
      setNavExpanded: (navExpanded: boolean) => set({ navExpanded }),
    }),
    {
      name: "flash-cards-store-v1",
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        theme: state.theme,
        currentSet: state.currentSet,
        navExpanded: state.navExpanded,
        skipEnabled: state.skipEnabled,
        speechSupported: state.speechSupported,
      }),
      onRehydrateStorage: (state) => () => state.setHasHydrated(true),
    },
  ),
);

export default useAppStore;
