import { create } from "zustand";
import { createJSONStorage, persist, StateStorage } from "zustand/middleware";
import {
  db,
  DEFAULT_CONTENT,
  getContentOptions,
  getProgressForGroup,
  initializeGroupContent,
  saveProgressForGroup,
} from "../db";
import type {
  Card,
  ContentOption,
  ProgressMap,
  ThemePreference,
} from "../types";
import { initializeMissingProgress } from "../utils/cardProgress";

const dbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const row = await db.uiStore.get(name);
    return row?.state ?? null;
  },
  setItem: async (name: string, newValue: string): Promise<void> => {
    await db.uiStore.put({ key: name, state: newValue });
  },
  removeItem: async (name: string): Promise<void> => {
    await db.uiStore.delete(name);
  },
};

const DEFAULT_THEME: ThemePreference = "system";
const DEFAULT_GROUP = "body-parts";

export type AppState = {
  _hasHydrated: boolean;
  initialized: boolean;
  contentOptions: ContentOption[];
  cards: Card[];
  currentCard: Card | null;
  currentGroup: string;
  listening: boolean;
  now: number;
  progress: ProgressMap;
  recognizedText: string;
  result: string;
  resultClass: string;
  skipEnabled: boolean;
  speechSupported: boolean;
  theme: ThemePreference;
  wrongAttempts: number;
  libraryNavOpen: boolean;
};

export type AppActions = {
  initialize: () => Promise<void>;
  loadGroupData: (group: string) => Promise<void>;
  refreshContentOptions: (preferredGroup?: string) => Promise<ContentOption[]>;
  setContentOptions: (options: ContentOption[]) => void;
  setCards: (cards: Card[]) => void;
  setCurrentCard: (card: Card | null) => void;
  setCurrentGroup: (group: string) => void;
  setListening: (listening: boolean) => void;
  setNow: (now: number) => void;
  setProgress: (progress: ProgressMap) => Promise<void>;
  setRecognizedText: (text: string) => void;
  setResult: (result: string) => void;
  setResultClass: (resultClass: string) => void;
  setSkipEnabled: (enabled: boolean) => void;
  setSpeechSupported: (supported: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
  setWrongAttempts: (attempts: number) => void;
  setLibraryNavOpen: (open: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
};

export type AppStore = AppState & AppActions;

const DEFAULT_STATE: AppState = {
  _hasHydrated: false,
  initialized: false,
  contentOptions: DEFAULT_CONTENT,
  cards: [],
  currentCard: null,
  currentGroup: DEFAULT_GROUP,
  listening: false,
  now: Date.now(),
  progress: {},
  recognizedText: "Press Start Listening",
  result: "",
  resultClass: "",
  skipEnabled: true,
  speechSupported: false,
  theme: DEFAULT_THEME,
  wrongAttempts: 0,
  libraryNavOpen: false,
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
        const { currentGroup } = get();
        const contentOptions = await get().refreshContentOptions(currentGroup);

        const groupToLoad = contentOptions.some(
          (option) => option.key === currentGroup,
        )
          ? currentGroup
          : contentOptions[0]?.key || DEFAULT_GROUP;

        await get().loadGroupData(groupToLoad);

        set({
          initialized: true,
        });
      },

      loadGroupData: async (group: string) => {
        const { progress } = get();
        const [storedProgress, loadedCards] = await Promise.all([
          getProgressForGroup(group),
          initializeGroupContent(group),
        ]);
        const nextProgress = initializeMissingProgress(
          loadedCards,
          storedProgress || progress[group] || {},
        );
        await saveProgressForGroup(group, nextProgress);
        set((prev) => ({
          cards: loadedCards,
          progress: { ...prev.progress, [group]: nextProgress },
        }));
      },

      refreshContentOptions: async (preferredGroup?: string) => {
        const targetGroup = preferredGroup || get().currentGroup;
        const options = await getContentOptions();
        set({ contentOptions: options });
        if (
          !options.some((option) => option.key === targetGroup) &&
          options[0]
        ) {
          set({ currentGroup: options[0].key });
        }
        return options;
      },

      setContentOptions: (contentOptions) => set({ contentOptions }),
      setCards: (cards) => set({ cards }),
      setCurrentCard: (currentCard) => set({ currentCard }),
      setCurrentGroup: (group) => set({ currentGroup: group }),
      setListening: (listening) => set({ listening }),
      setNow: (now) => set({ now }),
      setProgress: async (progress) => {
        await Promise.all(
          Object.entries(progress).map(([group, groupProgress]) =>
            saveProgressForGroup(group, groupProgress),
          ),
        );
        set((prev) => ({ progress: { ...prev.progress, ...progress } }));
      },
      setRecognizedText: (recognizedText) => set({ recognizedText }),
      setResult: (result) => set({ result }),
      setResultClass: (resultClass) => set({ resultClass }),
      setSkipEnabled: (skipEnabled) => set({ skipEnabled }),
      setSpeechSupported: (speechSupported) => set({ speechSupported }),
      setTheme: (theme) => set({ theme }),
      setWrongAttempts: (wrongAttempts) => set({ wrongAttempts }),
      setLibraryNavOpen: (libraryNavOpen: boolean) => set({ libraryNavOpen }),
    }),
    {
      name: "global",
      storage: createJSONStorage(() => dbStorage),
      partialize: (state) => ({
        theme: state.theme,
        currentGroup: state.currentGroup,
        skipEnabled: state.skipEnabled,
        speechSupported: state.speechSupported,
      }),
      version: 1,
      onRehydrateStorage: (state) => () => state.setHasHydrated(true),
    },
  ),
);

export default useAppStore;
