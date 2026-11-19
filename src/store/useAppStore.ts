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
  now: number;
  progress: ProgressMap;
  theme: ThemePreference;
  isLeftHanded: boolean;
  autoPronounce: boolean;
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
  setNow: (now: number) => void;
  setProgress: (progress: ProgressMap) => Promise<void>;
  setTheme: (theme: ThemePreference) => void;
  setIsLeftHanded: (isLeftHanded: boolean) => void;
  setAutoPronounce: (autoPronounce: boolean) => void;
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
  now: Date.now(),
  progress: {},
  theme: DEFAULT_THEME,
  isLeftHanded: false,
  autoPronounce: false,
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
          currentGroup: group,
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
      setNow: (now) => set({ now }),
      setProgress: async (progress) => {
        await Promise.all(
          Object.entries(progress).map(([group, groupProgress]) =>
            saveProgressForGroup(group, groupProgress),
          ),
        );
        set((prev) => ({ progress: { ...prev.progress, ...progress } }));
      },
      setTheme: (theme) => set({ theme }),
      setIsLeftHanded: (isLeftHanded) => set({ isLeftHanded }),
      setAutoPronounce: (autoPronounce) => set({ autoPronounce }),
      setLibraryNavOpen: (libraryNavOpen: boolean) => set({ libraryNavOpen }),
    }),
    {
      name: "global",
      storage: createJSONStorage(() => dbStorage),
      partialize: (state) => ({
        theme: state.theme,
        currentGroup: state.currentGroup,
        isLeftHanded: state.isLeftHanded,
        autoPronounce: state.autoPronounce,
      }),
      version: 1,
      onRehydrateStorage: (state) => () => state.setHasHydrated(true),
    },
  ),
);

export default useAppStore;
