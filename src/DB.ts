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
  contentMetadata: EntityTable<ContentMetadata, "group">;
  progress: EntityTable<ProgressRecord, "group">;
  settings: EntityTable<SettingRecord, "key">;
};

db.version(1).stores({
  uiStore: "key",
  content: "text, setName",
  contentMetadata: "setName",
  progress: "setName",
  settings: "key",
});

db.version(2)
  .stores({
    uiStore: "key",
    content: "text, group",
    contentMetadata: "group",
    progress: "group",
    settings: "key",
  })
  .upgrade((transaction) =>
    Promise.all(
      ["content", "contentMetadata", "progress"].map((tableName) =>
        transaction
          .table(tableName)
          .toCollection()
          .modify((record) => {
            const legacyGroup = record.setName;
            if (typeof legacyGroup === "string") record.group = legacyGroup;
            delete record.setName;
          }),
      ),
    ),
  );

export { db };

export function getContentRows() {
  return db.content.toArray();
}

export const DEFAULT_CONTENT: ContentOption[] = [
  { key: "body-parts", label: "Body Parts" },
  { key: "food", label: "Food" },
  { key: "sentences", label: "Sentences" },
];

async function getStoreCountForGroup(group: string) {
  return db.content.where("group").equals(group).count();
}

export function getContentGroupBaseName(fileName: string) {
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

async function resolveContentUrl(group: string) {
  const tried: string[] = [];
  for (const suffix of [".csv.gz", ".csv"]) {
    const url = `content/${group}${suffix}`;
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

async function fetchAndSeed(currentGroup: string) {
  const { response, url } = await resolveContentUrl(currentGroup);
  const text = url.endsWith(".gz")
    ? await decompressOrDecodeBuffer(await response.arrayBuffer())
    : await response.text();
  const data = parseCsv(text);

  await db.content.bulkPut(
    data.map((item) => ({ ...item, group: currentGroup })),
  );
}

export async function getAllCardsForGroup(
  currentGroup: string,
): Promise<Card[]> {
  const records = await db.content.toArray();
  return records.filter(
    (record) => !record.group || record.group === currentGroup,
  );
}

export function getDisplayNameForGroup(group: string) {
  const defaultEntry = DEFAULT_CONTENT.find((item) => item.key === group);
  if (defaultEntry) return defaultEntry.label;

  return group
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function getContentMetadata(
  group: string,
): Promise<ContentMetadata | undefined> {
  return db.contentMetadata.get(group);
}

export async function setContentMetadata(metadata: {
  group: string;
  displayName: string;
  importedAt: number;
}) {
  await db.contentMetadata.put(metadata);
}

async function deleteContentMetadata(group: string) {
  await db.contentMetadata.delete(group);
}

function deleteContentRecords(group: string) {
  return db.content.where("group").equals(group).delete();
}

export async function deleteContent(group: string) {
  await deleteContentRecords(group);
  await deleteContentMetadata(group);
}

export async function getContentDisplayName(group: string) {
  const metadata = await getContentMetadata(group);
  return metadata?.displayName || getDisplayNameForGroup(group);
}

export async function getUniqueContentGroups() {
  const groups = new Set(DEFAULT_CONTENT.map((item) => item.key));
  const records = await db.content.toArray();
  for (const record of records) {
    if (record.group) groups.add(record.group);
  }

  return Array.from(groups);
}

export async function getContentOptions() {
  const storedGroups = await getUniqueContentGroups();
  const optionSet = new Set<string>();
  const options: ContentOption[] = [];

  for (const content of DEFAULT_CONTENT) {
    optionSet.add(content.key);
    options.push(content);
  }

  for (const group of storedGroups) {
    if (optionSet.has(group)) continue;
    optionSet.add(group);
    const metadata = await getContentMetadata(group);
    options.push({
      key: group,
      label: metadata?.displayName || getDisplayNameForGroup(group),
    });
  }

  return options;
}

export async function importContent(group: string, cards: Card[]) {
  await deleteContentRecords(group);
  await db.content.bulkPut(cards.map((item) => ({ ...item, group })));
}

export async function initializeGroupContent(currentGroup: string) {
  const groupCount = await getStoreCountForGroup(currentGroup);

  if (groupCount > 0) return getAllCardsForGroup(currentGroup);

  await fetchAndSeed(currentGroup);
  return getAllCardsForGroup(currentGroup);
}

export async function deleteAppDatabase() {
  await db.delete();
}
