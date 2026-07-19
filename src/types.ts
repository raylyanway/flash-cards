export type ThemePreference = "system" | "light" | "dark";

export type Screen =
  | "home"
  | "learn"
  | "content"
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

export type ContentOption = {
  key: string;
  label: string;
};

export type Settings = {
  currentSet?: string;
  theme?: ThemePreference;
};
