export type ThemePreference = "system" | "light" | "dark";

export type Card = {
  text: string;
  answers?: string[];
  group?: string;
  [key: string]: unknown;
};

export type ProgressEntry = {
  stage: number;
  nextReview: number;
  correctCount: number;
};

export type ProgressMap = Record<string, Record<string, ProgressEntry>>;
export type GroupProgress = Record<string, ProgressEntry>;

export type ContentOption = {
  key: string;
  label: string;
};

export type Settings = {
  currentGroup?: string;
  theme?: ThemePreference;
};

export type ContentRecord = Card & {
  group: string;
};

export type ContentMetadata = {
  group: string;
  displayName?: string;
  importedAt?: number;
};

export type ProgressRecord = {
  group: string;
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
