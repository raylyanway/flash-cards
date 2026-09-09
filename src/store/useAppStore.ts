import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import {
  DEFAULT_CONTENT,
  getContentOptions,
  getProgressFromDB,
  getSettingsFromDB,
  initializeContent,
  setProgressToDB,
} from "../DB";
import type {
  Card,
  ContentOption,
  ProgressMap,
  ThemePreference,
} from "../types";
import { initializeMissingProgress } from "../utils/cardProgress";
import idbStateStorage from "./persistStorage";

const DEFAULT_THEME: ThemePreference = "system";
const DEFAULT_SET = "body-parts";

export type AppState = {
  initialized: boolean;
  isHydrated: boolean;
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
  setupBackup: ProgressMap | null;
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
  saveProgress: (progress: ProgressMap) => Promise<void>;
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
  setSetupBackup: (progress: ProgressMap | null) => void;
  setSkipEnabled: (enabled: boolean) => void;
  setSpeechSupported: (supported: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  setWrongAttempts: (attempts: number) => void;
  setNavExpanded: (expanded: boolean) => void;
  setIsHydrated: (hydrated: boolean) => void;
};

export type AppStore = AppState & AppActions;

const DEFAULT_STATE: AppState = {
  initialized: false,
  isHydrated: false,
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

      setIsHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),

      initialize: async () => {
        try {
          const settings = await getSettingsFromDB();
          const savedSet = settings.currentSet || DEFAULT_SET;
          const contentOptions = await get().refreshContentOptions(savedSet);

          const setToLoad = contentOptions.some(
            (option) => option.key === savedSet,
          )
            ? savedSet
            : contentOptions[0]?.key || DEFAULT_SET;

          await get().loadSetData(setToLoad);

          set({
            theme: settings.theme ?? DEFAULT_THEME,
            currentSet: savedSet,
            initialized: true,
          });
        } catch (err) {
          console.error("initialize failed:", err);
          // still mark initialized to avoid blocking UI indefinitely
          set({ initialized: true });
        }
      },

      loadSetData: async (setName: string) => {
        try {
          const [storedProgress, loadedCards] = await Promise.all([
            getProgressFromDB(setName),
            initializeContent(setName),
          ]);
          const nextProgress = initializeMissingProgress(
            loadedCards,
            storedProgress || {},
          );
          set({ cards: loadedCards, progress: nextProgress });
          await setProgressToDB(setName, nextProgress);
        } catch (err) {
          console.error("loadSetData failed:", err);
        }
      },

      refreshContentOptions: async (preferredSet?: string) => {
        try {
          const targetSet = preferredSet || get().currentSet;
          const options = await getContentOptions();
          set({ contentOptions: options });
          if (
            !options.some((option) => option.key === targetSet) &&
            options[0]
          ) {
            set({ currentSet: options[0].key });
          }
          return options;
        } catch (err) {
          console.error("refreshContentOptions failed:", err);
          return get().contentOptions;
        }
      },

      saveProgress: async (progress) => {
        try {
          set({ progress });
          await setProgressToDB(get().currentSet, progress);
        } catch (err) {
          console.error("saveProgress failed:", err);
        }
      },

      setContentOptions: (contentOptions) => set({ contentOptions }),
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
      setSetupBackup: (setupBackup) => set({ setupBackup }),
      setSkipEnabled: (skipEnabled) => set({ skipEnabled }),
      setSpeechSupported: (speechSupported) => set({ speechSupported }),
      setTheme: (theme) => set({ theme }),
      setWrongAttempts: (wrongAttempts) => set({ wrongAttempts }),
      setNavExpanded: (navExpanded: boolean) => set({ navExpanded }),
    }),
    {
      name: "flash-cards-store-v1",
      storage: idbStateStorage as StateStorage,
      // Called when rehydration starts/finishes
      onRehydrateStorage: (hydration) => {
        return (err) => {
          if (err) return;
          try {
            const maybe = hydration as unknown as {
              setState?: (state: Partial<AppState>, replace?: boolean) => void;
            };
            maybe.setState?.({ isHydrated: true }, true);
          } catch {
            // ignore
          }
        };
      },
    },
  ),
);

export default useAppStore;
