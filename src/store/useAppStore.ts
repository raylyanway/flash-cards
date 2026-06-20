import { create } from "zustand";
import { DEFAULT_CARDSETS, setProgressToDB } from "../cardData";
import type {
  Card,
  CardsetOption,
  ProgressMap,
  Screen,
  ThemePreference,
} from "../types";

const DEFAULT_THEME: ThemePreference = "system";
const DEFAULT_SET = "body-parts";

type AppState = {
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
