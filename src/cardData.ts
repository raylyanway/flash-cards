import type { Card, ContentOption, ProgressMap, Settings } from "./types";

export const DEFAULT_CONTENT: ContentOption[] = [
  { key: "body-parts", label: "Body Parts" },
  { key: "food", label: "Food" },
  { key: "sentences", label: "Sentences" },
];

const LATEST_DATA_VERSION = 1;
const DB_NAME = "flashCardDB";
const DB_VERSION = 1;
const CONTENT_STORE_NAME = "content";
const CONTENT_METADATA_STORE_NAME = "contentMetadata";
const PROGRESS_STORE_NAME = "progress";
const SETTINGS_STORE_NAME = "settings";
const CACHE_VERSION_KEY = "cached_data_version";
const CSV_DELIMITER = ",";

let dbConnection: IDBDatabase | null = null;

export function ensureStorageAvailable() {
  if (!window.indexedDB) {
    throw new Error("IndexedDB is not supported by this browser.");
  }
}

function openDatabase(): Promise<IDBDatabase> {
  ensureStorageAvailable();

  if (dbConnection) {
    return Promise.resolve(dbConnection);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB."));
    };

    request.onblocked = () => {
      console.warn(
        "IndexedDB open blocked. Close other tabs using this database.",
      );
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(CONTENT_STORE_NAME)) {
        const store = db.createObjectStore(CONTENT_STORE_NAME, {
          keyPath: "text",
        });
        store.createIndex("setName", "setName", { unique: false });
      } else {
        const store = (
          event.target as IDBOpenDBRequest
        ).transaction?.objectStore(CONTENT_STORE_NAME);
        if (store && !store.indexNames.contains("setName")) {
          store.createIndex("setName", "setName", { unique: false });
        }
      }

      if (!db.objectStoreNames.contains(CONTENT_METADATA_STORE_NAME)) {
        db.createObjectStore(CONTENT_METADATA_STORE_NAME, {
          keyPath: "setName",
        });
      }

      if (!db.objectStoreNames.contains(PROGRESS_STORE_NAME)) {
        db.createObjectStore(PROGRESS_STORE_NAME, { keyPath: "setName" });
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
        db.createObjectStore(SETTINGS_STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onerror = (event) => {
        console.error("IndexedDB error:", (event.target as IDBRequest).error);
      };
      db.onversionchange = () => {
        db.close();
        if (dbConnection === db) {
          dbConnection = null;
        }
      };
      dbConnection = db;
      resolve(db);
    };
  });
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

function getStoreCountForSet(
  db: IDBDatabase,
  setName: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONTENT_STORE_NAME, "readonly");
    const store = tx.objectStore(CONTENT_STORE_NAME);

    if (store.indexNames.contains("setName")) {
      const request = store.index("setName").count(IDBKeyRange.only(setName));
      request.onerror = () => {
        reject(
          request.error || new Error("Failed to count records for content."),
        );
      };
      request.onsuccess = () => resolve(request.result);
      return;
    }

    let count = 0;
    const cursorRequest = store.openCursor();
    cursorRequest.onerror = () => {
      reject(
        cursorRequest.error ||
          new Error("Failed to count records for content."),
      );
    };
    cursorRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (!cursor) {
        resolve(count);
        return;
      }
      if ((cursor.value as Card).setName === setName) {
        count += 1;
      }
      cursor.continue();
    };
  });
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

async function fetchAndSeed(currentSet: string, db: IDBDatabase) {
  const { response, url } = await resolveContentUrl(currentSet);
  const text = url.endsWith(".gz")
    ? await decompressOrDecodeBuffer(await response.arrayBuffer())
    : await response.text();
  const data = parseCsvToJson(text);

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CONTENT_STORE_NAME, "readwrite");
    const store = tx.objectStore(CONTENT_STORE_NAME);

    tx.onerror = () =>
      reject(tx.error || new Error("Transaction failed during seed."));
    tx.oncomplete = () => {
      setCachedDataVersion(LATEST_DATA_VERSION);
      resolve();
    };

    try {
      for (const item of data) {
        store.put({ ...item, setName: currentSet });
      }
    } catch (error) {
      reject(error);
    }
  });
}

export function getAllCardsForSet(currentSet: string): Promise<Card[]> {
  return openDatabase().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CONTENT_STORE_NAME, "readonly");
      const store = tx.objectStore(CONTENT_STORE_NAME);
      const cardsForSet: Card[] = [];
      const request = store.indexNames.contains("setName")
        ? store.index("setName").openCursor(IDBKeyRange.only(currentSet))
        : store.openCursor();

      request.onerror = () => {
        reject(
          request.error || new Error("Failed to read cards from IndexedDB."),
        );
      };
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (!cursor) {
          resolve(cardsForSet);
          return;
        }

        const record = cursor.value as Card;
        if (!record.setName || record.setName === currentSet) {
          cardsForSet.push(record);
        }
        cursor.continue();
      };
    });
  });
}

export function getDisplayNameForSet(setName: string) {
  const defaultEntry = DEFAULT_CONTENT.find((item) => item.key === setName);
  if (defaultEntry) return defaultEntry.label;

  return setName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function getContentMetadata(setName: string): Promise<{
  setName: string;
  displayName?: string;
  importedAt?: number;
} | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONTENT_METADATA_STORE_NAME, "readonly");
    const store = tx.objectStore(CONTENT_METADATA_STORE_NAME);
    const request = store.get(setName);

    request.onerror = () =>
      reject(request.error || new Error("Failed to read content metadata."));
    request.onsuccess = () => resolve(request.result || null);
  });
}

export async function setContentMetadata(metadata: {
  setName: string;
  displayName: string;
  importedAt: number;
}) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CONTENT_METADATA_STORE_NAME, "readwrite");
    tx.objectStore(CONTENT_METADATA_STORE_NAME).put(metadata);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error || new Error("Content metadata transaction failed."));
  });
}

async function deleteContentMetadata(setName: string) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CONTENT_METADATA_STORE_NAME, "readwrite");
    tx.objectStore(CONTENT_METADATA_STORE_NAME).delete(setName);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(
        tx.error || new Error("Content metadata delete transaction failed."),
      );
  });
}

function deleteContentRecords(db: IDBDatabase, setName: string) {
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CONTENT_STORE_NAME, "readwrite");
    const store = tx.objectStore(CONTENT_STORE_NAME);
    const request = store.indexNames.contains("setName")
      ? store.index("setName").openCursor(IDBKeyRange.only(setName))
      : store.openCursor();

    request.onerror = () =>
      reject(request.error || new Error("Failed to delete content records."));
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (!cursor) {
        resolve();
        return;
      }

      if (
        !store.indexNames.contains("setName") ||
        cursor.value.setName === setName
      ) {
        cursor.delete();
      }
      cursor.continue();
    };
  });
}

export async function deleteContent(setName: string) {
  const db = await openDatabase();
  await deleteContentRecords(db, setName);
  await deleteContentMetadata(setName);
  await deleteProgressFromDB(setName);
}

export async function getContentDisplayName(setName: string) {
  const metadata = await getContentMetadata(setName);
  return metadata?.displayName || getDisplayNameForSet(setName);
}

export async function getUniqueContentNames() {
  const names = new Set(DEFAULT_CONTENT.map((item) => item.key));
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CONTENT_STORE_NAME, "readonly");
    const request = tx.objectStore(CONTENT_STORE_NAME).openCursor();
    request.onerror = () =>
      reject(request.error || new Error("Failed to iterate content."));
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (!cursor) {
        resolve();
        return;
      }

      if ((cursor.value as Card).setName) {
        names.add((cursor.value as Card).setName as string);
      }
      cursor.continue();
    };
  });

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
  const db = await openDatabase();
  await deleteContentRecords(db, setName);

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CONTENT_STORE_NAME, "readwrite");
    const store = tx.objectStore(CONTENT_STORE_NAME);
    tx.onerror = () =>
      reject(tx.error || new Error("Failed to import content."));
    tx.oncomplete = () => resolve();

    try {
      for (const item of cards) {
        store.put({ ...item, setName });
      }
    } catch (error) {
      reject(error);
    }
  });
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

async function clearDefaultContent(db: IDBDatabase) {
  await Promise.all(
    DEFAULT_CONTENT.map((item) => deleteContentRecords(db, item.key)),
  );
}

export async function initializeContent(currentSet: string) {
  ensureStorageAvailable();
  const db = await openDatabase();
  const cachedVersion = await getCachedDataVersion();
  const setCount = await getStoreCountForSet(db, currentSet);

  if (cachedVersion !== LATEST_DATA_VERSION) {
    await clearDefaultContent(db);
    if (DEFAULT_CONTENT.some((item) => item.key === currentSet)) {
      await fetchAndSeed(currentSet, db);
    }
    return getAllCardsForSet(currentSet);
  }

  if (setCount > 0) return getAllCardsForSet(currentSet);

  await fetchAndSeed(currentSet, db);
  return getAllCardsForSet(currentSet);
}

export async function getProgressFromDB(
  setName: string,
): Promise<ProgressMap | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(PROGRESS_STORE_NAME, "readonly");
      const request = tx.objectStore(PROGRESS_STORE_NAME).get(setName);
      request.onerror = () =>
        reject(
          request.error || new Error("Failed to read progress from IndexedDB."),
        );
      request.onsuccess = () =>
        resolve(request.result ? request.result.data : null);
    });
  } catch (error) {
    console.error("getProgressFromDB failed:", error);
    return null;
  }
}

export async function setProgressToDB(
  setName: string,
  progressData: ProgressMap,
) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PROGRESS_STORE_NAME, "readwrite");
    tx.objectStore(PROGRESS_STORE_NAME).put({
      setName,
      data: progressData,
      lastUpdated: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error || new Error("Progress transaction failed."));
  });
}

async function deleteProgressFromDB(setName: string) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PROGRESS_STORE_NAME, "readwrite");
    tx.objectStore(PROGRESS_STORE_NAME).delete(setName);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error || new Error("Progress delete transaction failed."));
  });
}

export async function getSettingsFromDB(): Promise<Settings> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE_NAME, "readonly");
      const request = tx.objectStore(SETTINGS_STORE_NAME).get("settings");
      request.onerror = () =>
        reject(
          request.error || new Error("Failed to read settings from IndexedDB."),
        );
      request.onsuccess = () =>
        resolve(request.result ? request.result.data : {});
    });
  } catch (error) {
    console.error("getSettingsFromDB failed:", error);
    return {};
  }
}

export async function setSettingsToDB(settingsData: Settings) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE_NAME, "readwrite");
    tx.objectStore(SETTINGS_STORE_NAME).put({
      key: "settings",
      data: settingsData,
      lastUpdated: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error || new Error("Settings transaction failed."));
  });
}

export async function deleteAppDatabase() {
  if (dbConnection) {
    dbConnection.close();
    dbConnection = null;
  }

  return new Promise<void>((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onblocked = () =>
      reject(
        new Error(
          "Delete blocked by another open connection. Close other tabs first.",
        ),
      );
    request.onerror = () =>
      reject(request.error || new Error("Failed to delete IndexedDB."));
  });
}
