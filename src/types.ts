export type ThemePreference = "system" | "light" | "dark";

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

export type ProgressMap = Record<string, Record<string, ProgressEntry>>;
export type SetProgress = Record<string, ProgressEntry>;

export type ContentOption = {
  key: string;
  label: string;
};

export type Settings = {
  currentSet?: string;
  theme?: ThemePreference;
};

export type ContentRecord = Card & {
  setName: string;
};

export type ContentMetadata = {
  setName: string;
  displayName?: string;
  importedAt?: number;
};

export type ProgressRecord = {
  setName: string;
  progress: ProgressMap[string];
};

export type SettingRecord = {
  key: string;
  value: string;
};

export interface ParsedRow {
  [key: string]: string | string[];
}

export interface ParseOptions {
  /** Optional array of header keys that MUST exist in the spreadsheet */
  requiredHeaders?: string[];
}
