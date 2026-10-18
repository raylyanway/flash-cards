import type {
  Card,
  ContentMetadata,
  ContentOption,
  ContentRecord,
  LibraryImportRow,
  LibraryRecord,
  LibraryRow,
  ProgressMap,
  SettingRecord,
} from "./types";

import { Dexie, type EntityTable } from "dexie";
import { parseCsv } from "./utils/csv";

const db = new Dexie("flashCardsDB") as Dexie & {
  uiStore: EntityTable<{ key: string; state: string }, "key">;
  library: EntityTable<LibraryRecord>;
  contentMetadata: EntityTable<ContentMetadata, "group">;
  settings: EntityTable<SettingRecord, "key">;
};

db.version(1).stores({
  uiStore: "key",
  library: "[group+text], group, text",
  contentMetadata: "group",
  settings: "key",
});

export { db };

function toContentRecord(record: LibraryRecord): ContentRecord {
  return Object.fromEntries(
    Object.entries(record).filter(([field]) => field !== "learningProgress"),
  ) as ContentRecord;
}

export function getContentRows() {
  return db.library.toArray().then((records) => records.map(toContentRecord));
}

export async function getLibraryRows(
  fallbackProgress: ProgressMap = {},
): Promise<LibraryRow[]> {
  const libraryRecords = await db.library.toArray();
  return libraryRecords.map((record) => {
    const content = toContentRecord(record);
    const progress =
      fallbackProgress[content.group]?.[content.text] ??
      record.learningProgress;
    return {
      content,
      progress,
      isBuiltIn: DEFAULT_CONTENT.some((item) => item.key === content.group),
    };
  });
}

export async function getProgressForGroup(group: string) {
  const records = await db.library.where("group").equals(group).toArray();
  return Object.fromEntries(
    records.map((record) => [record.text, record.learningProgress]),
  );
}

export async function saveProgressForGroup(
  group: string,
  progress: ProgressMap[string],
) {
  await db.transaction("rw", db.library, async () => {
    const records = await db.library.where("group").equals(group).toArray();
    await db.library.bulkPut(
      records.map((record) => ({
        ...record,
        learningProgress: progress[record.text] ?? record.learningProgress,
      })),
    );
  });
}

export async function importLibraryRows(rows: LibraryImportRow[]) {
  const progressByGroup: ProgressMap = {};

  await db.transaction("rw", db.library, async () => {
    for (const row of rows) {
      if (!progressByGroup[row.group]) {
        const storedRows = await db.library
          .where("group")
          .equals(row.group)
          .toArray();
        progressByGroup[row.group] = Object.fromEntries(
          storedRows.map((record) => [record.text, record.learningProgress]),
        );
      }

      const existing = progressByGroup[row.group][row.card.text] ?? {
        stage: 0,
        nextReview: 0,
        correctCount: 0,
      };
      progressByGroup[row.group][row.card.text] = {
        ...existing,
        ...row.progress,
      };
    }

    await db.library.bulkPut(
      rows.map(({ group, card }) => ({
        ...card,
        group,
        learningProgress: progressByGroup[group][card.text],
      })),
    );
  });

  return progressByGroup;
}

export const DEFAULT_CONTENT: ContentOption[] = [
  { key: "body-parts", label: "Body Parts" },
  { key: "food", label: "Food" },
  { key: "sentences", label: "Sentences" },
];

async function getStoreCountForGroup(group: string) {
  return db.library.where("group").equals(group).count();
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

  await db.library.bulkPut(
    data.map((item) => ({
      ...item,
      group: currentGroup,
      learningProgress: { stage: 0, nextReview: 0, correctCount: 0 },
    })),
  );
}

export async function getAllCardsForGroup(
  currentGroup: string,
): Promise<Card[]> {
  const records = await db.library
    .where("group")
    .equals(currentGroup)
    .toArray();
  return records.map(toContentRecord);
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
  return db.library.where("group").equals(group).delete();
}

export async function deleteContent(group: string) {
  await Promise.all([
    deleteContentRecords(group),
    deleteContentMetadata(group),
  ]);
}

export async function getContentDisplayName(group: string) {
  const metadata = await getContentMetadata(group);
  return metadata?.displayName || getDisplayNameForGroup(group);
}

export async function getUniqueContentGroups() {
  const groups = new Set(DEFAULT_CONTENT.map((item) => item.key));
  const records = await db.library.toArray();
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
  await db.transaction("rw", db.library, async () => {
    const existingRows = await db.library
      .where("group")
      .equals(group)
      .toArray();
    const existingProgress = new Map(
      existingRows.map((record) => [record.text, record.learningProgress]),
    );
    await db.library.where("group").equals(group).delete();
    await db.library.bulkPut(
      cards.map((item) => ({
        ...item,
        group,
        learningProgress: existingProgress.get(item.text) ?? {
          stage: 0,
          nextReview: 0,
          correctCount: 0,
        },
      })),
    );
  });
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
