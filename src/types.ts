export type ThemePreference = "system" | "light" | "dark";

export type Screen =
  | "home"
  | "learn"
  | "cardSet"
  | "analytics"
  | "settings"
  | "progressSetup";

export type Card = {
  text: string;
  answers?: string[];
  setName?: string;
  [key: string]: unknown;
};

export type ProgressEntry = {
  stage: number;
  nextReview: number;
  correctCount: number;
};

export type ProgressMap = Record<string, ProgressEntry>;

export type CardsetOption = {
  key: string;
  label: string;
};

export type Settings = {
  currentSet?: string;
  theme?: ThemePreference;
};
