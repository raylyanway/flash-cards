import type { Card, ContentOption, ProgressMap } from "./types";

import { Dexie, type EntityTable } from "dexie";
type ContentRecord = Card & {
  setName: string;
};

type ContentMetadata = {
  setName: string;
  displayName?: string;
  importedAt?: number;
};

type ProgressRecord = {
  setName: string;
  progress: ProgressMap[string];
};

type SettingRecord = {
  key: string;
  value: string;
};

const db = new Dexie("flashCardDB") as Dexie & {
  uiStore: EntityTable<{ key: string; state: string }, "key">;
  content: EntityTable<ContentRecord, "text">;
  contentMetadata: EntityTable<ContentMetadata, "setName">;
  progress: EntityTable<ProgressRecord, "setName">;
  settings: EntityTable<SettingRecord, "key">;
};

db.version(1).stores({
  content: "text, setName",
  contentMetadata: "setName",
  progress: "setName",
  settings: "key",
});

db.version(2).stores({
  uiStore: "key",
  content: "text, setName",
  contentMetadata: "setName",
  progress: "setName",
  settings: "key",
});

export { db };

export const DEFAULT_CONTENT: ContentOption[] = [
  { key: "body-parts", label: "Body Parts" },
  { key: "food", label: "Food" },
  { key: "sentences", label: "Sentences" },
];

const LATEST_DATA_VERSION = 1;
const CACHE_VERSION_KEY = "cached_data_version";
const CSV_DELIMITER = ",";

async function getStoreCountForSet(setName: string) {
  return db.content.where("setName").equals(setName).count();
}

async function getCachedDataVersion() {
  try {
    return Number(localStorage.getItem(CACHE_VERSION_KEY) ?? 0);
  } catch (error) {
    console.warn(
      "Unable to read cached_data_version from localStorage.",
      error,
    );
    return 0;
  }
}

export async function setCachedDataVersion(version: number) {
  try {
    localStorage.setItem(CACHE_VERSION_KEY, String(version));
  } catch (error) {
    console.warn("Unable to write cached_data_version to localStorage.", error);
  }
}

export function getContentBaseName(fileName: string) {
  let name = fileName;
  if (name.toLowerCase().endsWith(".gz")) name = name.slice(0, -3);
  if (name.toLowerCase().endsWith(".csv")) name = name.slice(0, -4);
  return name;
}

function csvCellToValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseCsvToJson(csvText: string): Card[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === CSV_DELIMITER) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    if (!inQuotes && char === "\r") continue;
    cell += char;
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows.filter((r) =>
    r.some((cellValue) => cellValue !== ""),
  );
  if (!headers?.length) throw new Error("CSV file is missing header row.");

  const headerNames = headers.map((header) => header.trim());
  if (!headerNames.includes("text")) {
    throw new Error("CSV file must include a 'text' column.");
  }

  return dataRows.map((rowValues, rowIndex) => {
    const record: Card = { text: "" };
    for (let index = 0; index < headerNames.length; index += 1) {
      const key = headerNames[index];
      const rawValue = rowValues[index] ?? "";
      if (key === "answers") {
        const trimmed = rawValue.trim();
        let answersText = trimmed;
        if (answersText.startsWith("[") && answersText.endsWith("]")) {
          answersText = answersText.slice(1, -1);
        }
        record.answers = answersText
          ? answersText
              .split("|")
              .map((part) => part.trim())
              .filter(Boolean)
          : [];
      } else if (key === "text") {
        record.text = String(rawValue).trim();
      } else {
        record[key] = csvCellToValue(rawValue);
      }
    }

    if (!record.text) {
      throw new Error(`CSV row ${rowIndex + 2} is missing a text value.`);
    }

    return record;
  });
}

async function decompressOrDecodeBuffer(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return new TextDecoder().decode(buffer);
  }

  if (!window.DecompressionStream) {
    throw new Error("Browser does not support gzip decompression.");
  }

  const ds = new DecompressionStream("gzip");
  return new Response(new Blob([buffer]).stream().pipeThrough(ds)).text();
}

async function resolveContentUrl(setName: string) {
  const tried: string[] = [];
  for (const suffix of [".csv.gz", ".csv"]) {
    const url = `content/${setName}${suffix}`;
    tried.push(url);
    try {
      const response = await fetch(url, { cache: "reload" });
      if (response.ok) return { response, url };
    } catch {
      // Try the next supported file format.
    }
  }
  throw new Error(`Failed to fetch content data. Tried: ${tried.join(", ")}`);
}

async function fetchAndSeed(currentSet: string) {
  const { response, url } = await resolveContentUrl(currentSet);
  const text = url.endsWith(".gz")
    ? await decompressOrDecodeBuffer(await response.arrayBuffer())
    : await response.text();
  const data = parseCsvToJson(text);

  await db.content.bulkPut(
    data.map((item) => ({ ...item, setName: currentSet })),
  );
  await setCachedDataVersion(LATEST_DATA_VERSION);
}

export async function getAllCardsForSet(currentSet: string): Promise<Card[]> {
  const records = await db.content.toArray();
  return records.filter(
    (record) => !record.setName || record.setName === currentSet,
  );
}

export function getDisplayNameForSet(setName: string) {
  const defaultEntry = DEFAULT_CONTENT.find((item) => item.key === setName);
  if (defaultEntry) return defaultEntry.label;

  return setName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function getContentMetadata(
  setName: string,
): Promise<ContentMetadata | undefined> {
  return db.contentMetadata.get(setName);
}

export async function setContentMetadata(metadata: {
  setName: string;
  displayName: string;
  importedAt: number;
}) {
  await db.contentMetadata.put(metadata);
}

async function deleteContentMetadata(setName: string) {
  await db.contentMetadata.delete(setName);
}

function deleteContentRecords(setName: string) {
  return db.content.where("setName").equals(setName).delete();
}

export async function deleteContent(setName: string) {
  await deleteContentRecords(setName);
  await deleteContentMetadata(setName);
}

export async function getContentDisplayName(setName: string) {
  const metadata = await getContentMetadata(setName);
  return metadata?.displayName || getDisplayNameForSet(setName);
}

export async function getUniqueContentNames() {
  const names = new Set(DEFAULT_CONTENT.map((item) => item.key));
  const records = await db.content.toArray();
  for (const record of records) {
    if (record.setName) names.add(record.setName);
  }

  return Array.from(names);
}

export async function getContentOptions() {
  const storedNames = await getUniqueContentNames();
  const optionSet = new Set<string>();
  const options: ContentOption[] = [];

  for (const content of DEFAULT_CONTENT) {
    optionSet.add(content.key);
    options.push(content);
  }

  for (const setName of storedNames) {
    if (optionSet.has(setName)) continue;
    optionSet.add(setName);
    const metadata = await getContentMetadata(setName);
    options.push({
      key: setName,
      label: metadata?.displayName || getDisplayNameForSet(setName),
    });
  }

  return options;
}

export async function importContent(setName: string, cards: Card[]) {
  await deleteContentRecords(setName);
  await db.content.bulkPut(cards.map((item) => ({ ...item, setName })));
}

function escapeCsvValue(value: unknown) {
  if (value === undefined || value === null) return "";

  let output: string;
  if (Array.isArray(value)) output = value.join("|");
  else if (typeof value === "object") output = JSON.stringify(value);
  else output = String(value);

  if (new RegExp(`["${CSV_DELIMITER}\\r\\n]`).test(output)) {
    output = `"${output.replace(/"/g, '""')}"`;
  }
  return output;
}

export function createCsvFromCards(cards: Card[]) {
  const fieldSet = new Set<string>();
  for (const card of cards) {
    Object.keys(card).forEach((key) => {
      if (key !== "setName") fieldSet.add(key);
    });
  }

  const preferredOrder = ["text", "answers"];
  const extraFields = [...fieldSet].filter(
    (key) => !preferredOrder.includes(key),
  );
  const headers = [
    ...preferredOrder.filter((key) => fieldSet.has(key)),
    ...extraFields,
  ];

  return [
    headers.join(CSV_DELIMITER),
    ...cards.map((card) =>
      headers.map((key) => escapeCsvValue(card[key])).join(CSV_DELIMITER),
    ),
  ].join("\r\n");
}

export function createCsvFromProgress(
  progressData: ProgressMap,
  cards: Card[],
) {
  const headers = ["text", "stage", "nextReview", "correctCount"];
  const rows = [headers.join(CSV_DELIMITER)];

  for (const card of cards) {
    const progressEntry = progressData[card.text] || {
      stage: 0,
      nextReview: 0,
      correctCount: 0,
    };
    rows.push(
      [
        escapeCsvValue(card.text),
        escapeCsvValue(progressEntry.stage),
        escapeCsvValue(progressEntry.nextReview),
        escapeCsvValue(progressEntry.correctCount),
      ].join(CSV_DELIMITER),
    );
  }

  return rows.join("\r\n");
}

async function clearDefaultContent() {
  await Promise.all(
    DEFAULT_CONTENT.map((item) => deleteContentRecords(item.key)),
  );
}

export async function initializeContent(currentSet: string) {
  const cachedVersion = await getCachedDataVersion();
  const setCount = await getStoreCountForSet(currentSet);

  if (cachedVersion !== LATEST_DATA_VERSION) {
    await clearDefaultContent();
    if (DEFAULT_CONTENT.some((item) => item.key === currentSet)) {
      await fetchAndSeed(currentSet);
    }
    return getAllCardsForSet(currentSet);
  }

  if (setCount > 0) return getAllCardsForSet(currentSet);

  await fetchAndSeed(currentSet);
  return getAllCardsForSet(currentSet);
}

export async function deleteAppDatabase() {
  await db.delete();
}
