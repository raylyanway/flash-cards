import type {
  Card,
  ContentMetadata,
  ContentOption,
  ContentRecord,
  ProgressRecord,
  SettingRecord,
} from "./types";

import { Dexie, type EntityTable } from "dexie";
import { parseCsv } from "./utils/csv";

const db = new Dexie("flashCardsDB") as Dexie & {
  uiStore: EntityTable<{ key: string; state: string }, "key">;
  content: EntityTable<ContentRecord, "text">;
  contentMetadata: EntityTable<ContentMetadata, "setName">;
  progress: EntityTable<ProgressRecord, "setName">;
  settings: EntityTable<SettingRecord, "key">;
};

db.version(1).stores({
  uiStore: "key",
  content: "text, setName",
  contentMetadata: "setName",
  progress: "setName",
  settings: "key",
});

export { db };

export type IndexedDbRow = Record<string, unknown>;

export function getIndexedDbTableNames() {
  return db.tables.map((table) => table.name);
}

export async function getIndexedDbTableRows(tableName: string) {
  const table = db.table<IndexedDbRow, string | number>(tableName);

  return {
    rows: await table.toArray(),
    primaryKey: table.schema.primKey.keyPath,
  };
}

export async function updateIndexedDbTableRow(
  tableName: string,
  row: IndexedDbRow,
) {
  await db.table<IndexedDbRow, string | number>(tableName).put(row);
  return row;
}

export const DEFAULT_CONTENT: ContentOption[] = [
  { key: "body-parts", label: "Body Parts" },
  { key: "food", label: "Food" },
  { key: "sentences", label: "Sentences" },
];

async function getStoreCountForSet(setName: string) {
  return db.content.where("setName").equals(setName).count();
}

export function getContentBaseName(fileName: string) {
  let name = fileName;
  if (name.toLowerCase().endsWith(".gz")) name = name.slice(0, -3);
  if (name.toLowerCase().endsWith(".csv")) name = name.slice(0, -4);
  return name;
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
  const data = parseCsv(text);

  await db.content.bulkPut(
    data.map((item) => ({ ...item, setName: currentSet })),
  );
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

export async function initializeContent(currentSet: string) {
  const setCount = await getStoreCountForSet(currentSet);

  if (setCount > 0) return getAllCardsForSet(currentSet);

  await fetchAndSeed(currentSet);
  return getAllCardsForSet(currentSet);
}

export async function deleteAppDatabase() {
  await db.delete();
}
