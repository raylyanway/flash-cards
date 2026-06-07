// =====================================================
// APP STATE
// =====================================================

const STORAGE_KEY = "voice-trainer-progress";
const SETTINGS_KEY = "voice-trainer-settings";
const DEFAULT_THEME = "system";
let themePreference = DEFAULT_THEME;

const REVIEW_1_DELAY = 30 * 1000; // 30 sec
const REVIEW_2_DELAY = 60 * 1000; // 1 min

let cards = [];
let progress = {};
let currentCard = null;
let listening = false;
let recognition = null;
let sessionSkippedCards = new Set();
let wrongAttempts = 0;
const MAX_WRONG_ATTEMPTS = 3;

let currentSet = "body-parts";

// =====================================================
// DOM
// =====================================================

const homeScreen =
    document.getElementById("homeScreen");

const learnScreen =
    document.getElementById("learnScreen");

const analyticsScreen =
    document.getElementById("analyticsScreen");

const cardSetSelect =
    document.getElementById("cardSetSelect");

const continueBtn =
    document.getElementById("continueBtn");

const analyticsBtn =
    document.getElementById("analyticsBtn");

const resetBtn =
    document.getElementById("resetBtn");

const backHomeBtn =
    document.getElementById("backHomeBtn");

const analyticsBackBtn =
    document.getElementById("analyticsBackBtn");

const wordEl =
    document.getElementById("text");

const cardStatusEl =
    document.getElementById("cardStatus");

const progressFill =
    document.getElementById("progressFill");

const progressText =
    document.getElementById("progressText");

const nextReviewTime =
    document.getElementById("nextReviewTime");

const learnProgress =
    document.getElementById("learnProgress");

const recognizedText =
    document.getElementById("recognizedText");

const resultEl =
    document.getElementById("result");

const listenBtn =
    document.getElementById("listenBtn");

const speakBtn =
    document.getElementById("speakBtn");

const nextBtn =
    document.getElementById("nextBtn");

const setupProgressBtn =
    document.getElementById("setupProgressBtn");

const progressSetupScreen =
    document.getElementById("progressSetupScreen");

const closeProgressSetupBtn =
    document.getElementById("closeProgressSetupBtn");

const markAllNewBtn =
    document.getElementById("markAllNewBtn");

const markAllLearningBtn =
    document.getElementById("markAllLearningBtn");

const markAllLearnedBtn =
    document.getElementById("markAllLearnedBtn");

const progressSearchInput =
    document.getElementById("progressSearchInput");

const progressCardList =
    document.getElementById("progressCardList");

const exportProgressBtn =
    document.getElementById("exportProgressBtn");

const importProgressBtn =
    document.getElementById("importProgressBtn");

const importProgressFile =
    document.getElementById("importProgressFile");

const exportCardsetBtn =
    document.getElementById("exportCardsetBtn");

const importCardsetBtn =
    document.getElementById("importCardsetBtn");

const deleteCardsetBtn =
    document.getElementById("deleteCardsetBtn");

const importCardsetFile =
    document.getElementById("importCardsetFile");

const settingsBtn =
    document.getElementById("settingsBtn");

const settingsScreen =
    document.getElementById("settingsScreen");

const settingsBackBtn =
    document.getElementById("settingsBackBtn");

const themeOptionInputs =
    document.querySelectorAll('input[name="themeOption"]');

const deleteDatabaseBtn =
    document.getElementById("deleteDatabaseBtn");

const confirmSetupProgressBtn =
    document.getElementById("confirmSetupProgressBtn");

// =====================================================
// SCREEN NAVIGATION
// =====================================================

function showScreen(screen) {

    homeScreen.classList.remove("active");
    learnScreen.classList.remove("active");
    analyticsScreen.classList.remove("active");
    settingsScreen.classList.remove("active");
    progressSetupScreen.classList.remove("active");

    screen.classList.add("active");
}

// =====================================================
// STORAGE
// =====================================================

async function loadProgress() {
    try {
        const storedProgress = await getProgressFromDB(currentSet);
        progress = storedProgress || {};
    } catch (error) {
        console.error("Failed to load progress from IndexedDB:", error);
        progress = {};
    }
}

async function saveProgress() {
    try {
        await setProgressToDB(currentSet, progress);
    } catch (error) {
        console.error("Failed to save progress to IndexedDB:", error);
    }
}

// =====================================================
// INDEXEDDB CACHING
// =====================================================

const LATEST_DATA_VERSION = 1;
const DB_NAME = "flashCardDB";
const DB_VERSION = 1;
const CARDSETS_STORE_NAME = "cardsets";
const CARDSET_METADATA_STORE_NAME = "cardsetMetadata";
const PROGRESS_STORE_NAME = "progress";
const SETTINGS_STORE_NAME = "settings";
const CACHE_VERSION_KEY = "cached_data_version";
const CSV_DELIMITER = ',';

let dbConnection = null;

const DEFAULT_CARDSETS = [
    { key: "body-parts", label: "Body Parts" },
    { key: "animals", label: "Animals" },
    { key: "food", label: "Food" },
    { key: "sentences", label: "Sentences" }
    // { key: "medical", label: "Medical" }
];

function ensureStorageAvailable() {
    if (!window.indexedDB) {
        throw new Error("IndexedDB is not supported by this browser.");
    }
}

function openDatabase() {
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
            console.warn("IndexedDB open blocked. Close other tabs using this database.");
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(CARDSETS_STORE_NAME)) {
                const store = db.createObjectStore(CARDSETS_STORE_NAME, { keyPath: "text" });
                store.createIndex("setName", "setName", { unique: false });
            } else {
                const store = event.target.transaction.objectStore(CARDSETS_STORE_NAME);
                if (!store.indexNames.contains("setName")) {
                    store.createIndex("setName", "setName", { unique: false });
                }
            }

            if (!db.objectStoreNames.contains(CARDSET_METADATA_STORE_NAME)) {
                db.createObjectStore(CARDSET_METADATA_STORE_NAME, { keyPath: "setName" });
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
                console.error("IndexedDB error:", event.target.error);
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
        console.warn("Unable to read cached_data_version from localStorage.", error);
        return 0;
    }
}

async function setCachedDataVersion(version) {
    try {
        localStorage.setItem(CACHE_VERSION_KEY, String(version));
    } catch (error) {
        console.warn("Unable to write cached_data_version to localStorage.", error);
    }
}

function clearCardstore(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CARDSETS_STORE_NAME, "readwrite");
        const store = tx.objectStore(CARDSETS_STORE_NAME);

        const request = store.clear();

        request.onerror = () => {
            reject(request.error || new Error("Failed to clear cardsets store."));
        };

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Clear transaction failed."));
    });
}

function getStoreCountForSet(db, setName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CARDSETS_STORE_NAME, "readonly");
        const store = tx.objectStore(CARDSETS_STORE_NAME);

        if (store.indexNames.contains("setName")) {
            const index = store.index("setName");
            const request = index.count(IDBKeyRange.only(setName));

            request.onerror = () => {
                reject(request.error || new Error("Failed to count records for cardset."));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };
            return;
        }

        let count = 0;
        const cursorRequest = store.openCursor();

        cursorRequest.onerror = () => {
            reject(cursorRequest.error || new Error("Failed to count records for cardset."));
        };

        cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) {
                resolve(count);
                return;
            }

            const record = cursor.value;
            if (record.setName === setName) {
                count += 1;
            }

            cursor.continue();
        };
    });
}

function getStoreCount(db) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CARDSETS_STORE_NAME, "readonly");
        const store = tx.objectStore(CARDSETS_STORE_NAME);

        const request = store.count();
        request.onerror = () => {
            reject(request.error || new Error("Failed to count records in cardsets."));
        };
        request.onsuccess = () => {
            resolve(request.result);
        };
    });
}

const CARDSET_FILE_FORMATS = [
    { suffix: ".csv.gz", type: "csv" },
    { suffix: ".csv", type: "csv" },
    { suffix: ".json", type: "json" }
];

function getCardsetBaseName(fileName) {
    let name = fileName;
    if (name.toLowerCase().endsWith(".gz")) {
        name = name.slice(0, -3);
    }
    if (name.toLowerCase().endsWith(".json")) {
        name = name.slice(0, -5);
    }
    if (name.toLowerCase().endsWith(".csv")) {
        name = name.slice(0, -4);
    }
    return name;
}

function csvCellToValue(value) {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
            return JSON.parse(trimmed);
        } catch (error) {
            // fallback to raw string
        }
    }
    return trimmed;
}

function parseCsvToJson(csvText) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
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

        if (!inQuotes && char === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = "";
            continue;
        }

        if (!inQuotes && char === '\r') {
            continue;
        }

        cell += char;
    }

    if (cell !== "" || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }

    const [headers, ...dataRows] = rows.filter((r) => r.some((cellValue) => cellValue !== ""));
    if (!headers || headers.length === 0) {
        throw new Error("CSV file is missing header row.");
    }

    const headerNames = headers.map((header) => header.trim());
    if (!headerNames.includes("text")) {
        throw new Error("CSV file must include a 'text' column.");
    }

    return dataRows.map((rowValues, rowIndex) => {
        const record = {};
        for (let index = 0; index < headerNames.length; index++) {
            const key = headerNames[index];
            const rawValue = rowValues[index] ?? "";
            if (key === "answers") {
                const trimmed = rawValue.trim();
                if (!trimmed) {
                    record.answers = [];
                } else if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                    try {
                        record.answers = JSON.parse(trimmed);
                    } catch (error) {
                        record.answers = trimmed.split("|").map((part) => part.trim()).filter(Boolean);
                    }
                } else {
                    record.answers = trimmed.split("|").map((part) => part.trim()).filter(Boolean);
                }
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

async function decompressOrDecodeBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
        return new TextDecoder().decode(buffer);
    }

    if (!window.DecompressionStream) {
        throw new Error("Browser does not support gzip decompression.");
    }

    const ds = new DecompressionStream("gzip");
    const decompressedStream = new Response(new Blob([buffer]).stream().pipeThrough(ds));
    return decompressedStream.text();
}

function parseCardsetText(text, sourceName) {
    const trimmed = text.trim();
    if (sourceName.toLowerCase().endsWith(".json") || trimmed.startsWith("[") || trimmed.startsWith("{")) {
        return JSON.parse(trimmed);
    }

    return parseCsvToJson(text);
}

async function resolveCardsetUrl(setName) {
    const tried = [];
    for (const format of CARDSET_FILE_FORMATS) {
        const url = `cardsets/${setName}${format.suffix}`;
        tried.push(url);
        try {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) {
                return { response, url };
            }
        } catch (error) {
            // continue trying other formats
        }
    }
    throw new Error(`Failed to fetch cardset data. Tried: ${tried.join(", ")}`);
}

async function fetchAndSeed(currentSet, db) {
    let data;
    try {
        const { response, url } = await resolveCardsetUrl(currentSet);
        let text;

        if (url.endsWith(".gz")) {
            const buffer = await response.arrayBuffer();
            text = await decompressOrDecodeBuffer(buffer);
        } else {
            text = await response.text();
        }

        data = parseCardsetText(text, url);
        if (!Array.isArray(data)) {
            throw new Error("Expected array data from cardset file.");
        }
    } catch (error) {
        throw new Error(`Failed to fetch cardset for '${currentSet}': ${error.message}`);
    }

    return new Promise((resolve, reject) => {
        const tx = db.transaction(CARDSETS_STORE_NAME, "readwrite");
        const store = tx.objectStore(CARDSETS_STORE_NAME);

        tx.onerror = () => reject(tx.error || new Error("Transaction failed during seed."));
        tx.oncomplete = () => {
            setCachedDataVersion(LATEST_DATA_VERSION);
            resolve();
        };

        try {
            for (const item of data) {
                if (!item || typeof item.text !== "string") {
                    throw new Error("Each card object must include a string `text` key.");
                }
                store.put({ ...item, setName: currentSet });
            }
        } catch (error) {
            reject(error);
        }
    });
}

function getAllCardsForSet(currentSet) {
    return openDatabase().then((db) => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(CARDSETS_STORE_NAME, "readonly");
            const store = tx.objectStore(CARDSETS_STORE_NAME);

            const cardsForSet = [];
            let request;

            if (store.indexNames.contains("setName")) {
                const index = store.index("setName");
                request = index.openCursor(IDBKeyRange.only(currentSet));
            } else {
                request = store.openCursor();
            }

            request.onerror = () => {
                reject(request.error || new Error("Failed to read cards from IndexedDB."));
            };

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (!cursor) {
                    resolve(cardsForSet);
                    return;
                }

                const record = cursor.value;
                if (!record.setName || record.setName === currentSet) {
                    cardsForSet.push(record);
                }

                cursor.continue();
            };
        });
    });
}

function getDisplayNameForSet(setName) {
    const defaultEntry = DEFAULT_CARDSETS.find(item => item.key === setName);
    if (defaultEntry) {
        return defaultEntry.label;
    }

    return setName
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, char => char.toUpperCase());
}

async function getCardsetMetadata(setName) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(CARDSET_METADATA_STORE_NAME, "readonly");
            const store = tx.objectStore(CARDSET_METADATA_STORE_NAME);
            const request = store.get(setName);

            request.onerror = () => reject(request.error || new Error("Failed to read cardset metadata."));
            request.onsuccess = () => resolve(request.result || null);
        });
    } catch (error) {
        console.error("getCardsetMetadata failed:", error);
        return null;
    }
}

async function setCardsetMetadata(metadata) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(CARDSET_METADATA_STORE_NAME, "readwrite");
            const store = tx.objectStore(CARDSET_METADATA_STORE_NAME);
            const request = store.put(metadata);

            request.onerror = () => reject(request.error || new Error("Failed to write cardset metadata."));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("Cardset metadata transaction failed."));
        });
    } catch (error) {
        console.error("setCardsetMetadata failed:", error);
        throw error;
    }
}

async function deleteCardsetMetadata(setName) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(CARDSET_METADATA_STORE_NAME, "readwrite");
            const store = tx.objectStore(CARDSET_METADATA_STORE_NAME);
            const request = store.delete(setName);

            request.onerror = () => reject(request.error || new Error("Failed to delete cardset metadata."));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("Cardset metadata delete transaction failed."));
        });
    } catch (error) {
        console.error("deleteCardsetMetadata failed:", error);
        throw error;
    }
}

async function deleteProgressFromDB(setName) {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PROGRESS_STORE_NAME, "readwrite");
            const store = tx.objectStore(PROGRESS_STORE_NAME);
            const request = store.delete(setName);

            request.onerror = () => reject(request.error || new Error("Failed to delete progress data."));
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("Progress delete transaction failed."));
        });
    } catch (error) {
        console.error("deleteProgressFromDB failed:", error);
        throw error;
    }
}

async function deleteCardset(setName) {
    const db = await openDatabase();
    await deleteCardsetRecords(db, setName);
    await deleteCardsetMetadata(setName);
    await deleteProgressFromDB(setName);
}

function getCardsetDisplayName(setName) {
    return getCardsetMetadata(setName)
        .then(metadata => metadata?.displayName || getDisplayNameForSet(setName));
}

async function handleDeleteCardset() {
    const isDefault = DEFAULT_CARDSETS.some(item => item.key === currentSet);
    if (isDefault) {
        alert("Default cardsets cannot be deleted.");
        return;
    }

    const displayName = await getCardsetDisplayName(currentSet);
    const confirmed = confirm(
        `Delete cardset "${displayName}"? This will remove the cardset and its progress.`
    );

    if (!confirmed) {
        return;
    }

    try {
        await deleteCardset(currentSet);
        await refreshCardSetOptions();
        await saveSettings();
        await loadProgress();
        await loadCardSet();
        updateHomeStats();
        alert(`Cardset "${displayName}" deleted.`);
    } catch (error) {
        console.error("Failed to delete cardset:", error);
        alert("Unable to delete cardset. See console for details.");
    }
}

async function getUniqueCardsetNames() {
    const names = new Set(DEFAULT_CARDSETS.map(item => item.key));
    try {
        const db = await openDatabase();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(CARDSETS_STORE_NAME, "readonly");
            const store = tx.objectStore(CARDSETS_STORE_NAME);
            const request = store.openCursor();

            request.onerror = () => reject(request.error || new Error("Failed to iterate cardsets."));
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (!cursor) {
                    resolve();
                    return;
                }

                if (cursor.value.setName) {
                    names.add(cursor.value.setName);
                }
                cursor.continue();
            };
        });
    } catch (error) {
        console.warn("Unable to read stored cardset names:", error);
    }

    return Array.from(names);
}

async function refreshCardSetOptions() {
    const storedNames = await getUniqueCardsetNames();
    cardSetSelect.innerHTML = "";

    const optionSet = new Set();
    for (const cardset of DEFAULT_CARDSETS) {
        optionSet.add(cardset.key);
        const option = document.createElement("option");
        option.value = cardset.key;
        option.textContent = cardset.label;
        cardSetSelect.appendChild(option);
    }

    for (const setName of storedNames) {
        if (optionSet.has(setName)) {
            continue;
        }
        optionSet.add(setName);

        const metadata = await getCardsetMetadata(setName);
        const displayName = metadata?.displayName || getDisplayNameForSet(setName);

        const option = document.createElement("option");
        option.value = setName;
        option.textContent = displayName;
        cardSetSelect.appendChild(option);
    }

    if (optionSet.has(currentSet)) {
        cardSetSelect.value = currentSet;
    } else if (cardSetSelect.options.length > 0) {
        cardSetSelect.selectedIndex = 0;
        currentSet = cardSetSelect.value;
    }

    updateDeleteCardsetButtonState();
}

function updateDeleteCardsetButtonState() {
    const isDefault = DEFAULT_CARDSETS.some(item => item.key === currentSet);
    deleteCardsetBtn.disabled = isDefault;
    deleteCardsetBtn.title = isDefault
        ? "Default cardsets cannot be deleted"
        : "Delete the selected cardset";
}

function deleteCardsetRecords(db, setName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(CARDSETS_STORE_NAME, "readwrite");
        const store = tx.objectStore(CARDSETS_STORE_NAME);

        const request = store.indexNames.contains("setName")
            ? store.index("setName").openCursor(IDBKeyRange.only(setName))
            : store.openCursor();

        request.onerror = () => reject(request.error || new Error("Failed to delete cardset records."));
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) {
                resolve();
                return;
            }

            if (!store.indexNames.contains("setName") || cursor.value.setName === setName) {
                cursor.delete();
            }

            cursor.continue();
        };
    });
}

async function importCardset(setName, cards) {
    const db = await openDatabase();
    await deleteCardsetRecords(db, setName);

    return new Promise((resolve, reject) => {
        const tx = db.transaction(CARDSETS_STORE_NAME, "readwrite");
        const store = tx.objectStore(CARDSETS_STORE_NAME);

        tx.onerror = () => reject(tx.error || new Error("Failed to import cardset."));
        tx.oncomplete = () => resolve();

        try {
            for (const item of cards) {
                if (!item || typeof item.text !== "string") {
                    throw new Error("Each card object must include a string `text` key.");
                }
                store.put({ ...item, setName });
            }
        } catch (error) {
            reject(error);
        }
    });
}

function escapeCsvValue(value) {
    if (value === undefined || value === null) {
        return "";
    }

    let output = value;
    if (Array.isArray(value)) {
        output = value.join("|");
    } else if (typeof value === "object") {
        output = JSON.stringify(value);
    }

    output = String(output);
    const shouldQuote = new RegExp(`["${CSV_DELIMITER}\\r\\n]`).test(output);
    if (shouldQuote) {
        output = `"${output.replace(/"/g, '""')}"`;
    }
    return output;
}

function createCsvFromCards(cards) {
    const fieldSet = new Set();
    for (const card of cards) {
        Object.keys(card).forEach((key) => {
            if (key === "setName") {
                return;
            }
            fieldSet.add(key);
        });
    }

    const preferredOrder = ["text", "answers"];
    const extraFields = [...fieldSet].filter((key) => !preferredOrder.includes(key));
    const headers = [...preferredOrder.filter((key) => fieldSet.has(key)), ...extraFields];

    const rows = [headers.join(CSV_DELIMITER)];
    for (const card of cards) {
        const row = headers.map((key) => escapeCsvValue(card[key]));
        rows.push(row.join(CSV_DELIMITER));
    }

    return rows.join("\r\n");
}

async function gzipText(text) {
    if (!window.CompressionStream) {
        throw new Error("Browser does not support gzip compression.");
    }

    const encoder = new TextEncoder();
    const cs = new CompressionStream("gzip");
    const compressedStream = new Blob([encoder.encode(text)]).stream().pipeThrough(cs);
    return await new Response(compressedStream).blob();
}

async function exportCardset() {
    try {
        const cards = await getAllCardsForSet(currentSet);
        if (!cards.length) {
            alert("Nothing to export for this cardset.");
            return;
        }

        const csvText = createCsvFromCards(cards.map((card) => {
            const { setName, ...rest } = card;
            return rest;
        }));
        const blob = await gzipText(csvText);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${currentSet}.csv.gz`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("exportCardset failed:", error);
        alert("Unable to export cardset. See console for details.");
    }
}

function handleImportCardset(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const processFileText = async (text) => {
        let data;
        try {
            data = parseCardsetText(text, file.name);
        } catch (error) {
            throw new Error(`Failed to parse cardset file: ${error.message}`);
        }

        if (Array.isArray(data)) {
            const setName = getCardsetBaseName(file.name);
            if (!setName) {
                throw new Error("Unable to infer cardset name from the uploaded file name.");
            }

            const displayName = getDisplayNameForSet(setName);
            const existing = await getUniqueCardsetNames();
            if (existing.includes(setName)) {
                const confirmed = confirm(`A cardset named "${setName}" already exists. Overwrite it?`);
                if (!confirmed) {
                    return;
                }
            }

            await importCardset(setName, data);
            await setCardsetMetadata({ setName, displayName, importedAt: Date.now() });
            await refreshCardSetOptions();
            alert(`Cardset "${displayName}" imported successfully.`);
            return;
        }

        if (!data || typeof data.setName !== "string" || !Array.isArray(data.cards)) {
            throw new Error("Invalid cardset file format.");
        }

        const setName = data.setName.trim();
        if (!setName) {
            throw new Error("Cardset file must include a valid setName.");
        }

        const displayName = typeof data.displayName === "string"
            ? data.displayName.trim()
            : getDisplayNameForSet(setName);

        const existing = await getUniqueCardsetNames();
        if (existing.includes(setName)) {
            const confirmed = confirm(`A cardset named "${setName}" already exists. Overwrite it?`);
            if (!confirmed) {
                return;
            }
        }

        await importCardset(setName, data.cards);
        await setCardsetMetadata({ setName, displayName, importedAt: Date.now() });
        await refreshCardSetOptions();
        alert(`Cardset "${displayName}" imported successfully.`);
    };

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const result = e.target.result;
            if (file.name.toLowerCase().endsWith('.gz')) {
                const text = await decompressOrDecodeBuffer(result);
                await processFileText(text);
            } else {
                await processFileText(result);
            }
        } catch (error) {
            alert(`Failed to import cardset: ${error.message}`);
        } finally {
            event.target.value = "";
        }
    };

    if (file.name.toLowerCase().endsWith('.gz')) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

async function clearDefaultCardsets(db) {
    const defaultKeys = DEFAULT_CARDSETS.map(item => item.key);
    const tasks = defaultKeys.map(key => deleteCardsetRecords(db, key));
    await Promise.all(tasks);
}

async function initializeCardSet(currentSet) {
    try {
        ensureStorageAvailable();
        const db = await openDatabase();
        const cachedVersion = await getCachedDataVersion();
        const setCount = await getStoreCountForSet(db, currentSet);

        if (cachedVersion !== LATEST_DATA_VERSION) {
            await clearDefaultCardsets(db);

            const isDefault = DEFAULT_CARDSETS.some(item => item.key === currentSet);
            if (isDefault) {
                await fetchAndSeed(currentSet, db);
            }

            return await getAllCardsForSet(currentSet);
        }

        if (setCount > 0) {
            return await getAllCardsForSet(currentSet);
        }

        await fetchAndSeed(currentSet, db);
        return await getAllCardsForSet(currentSet);
    } catch (error) {
        console.error("initializeCardSet failed:", error);
        throw error;
    }
}

async function getCards(cardSet) {
    try {
        ensureStorageAvailable();
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(CARDSETS_STORE_NAME, "readonly");
            const store = tx.objectStore(CARDSETS_STORE_NAME);
            const request = store.get(cardSet);

            request.onerror = () => reject(request.error || new Error("Failed to read card from IndexedDB."));
            request.onsuccess = () => resolve(request.result ?? null);
        });
    } catch (error) {
        console.error("getCards failed:", error);
        throw error;
    }
}

// =====================================================
// PROGRESS STORAGE (IndexedDB)
// =====================================================

async function getProgressFromDB(setName) {
    try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(PROGRESS_STORE_NAME, "readonly");
            const store = tx.objectStore(PROGRESS_STORE_NAME);
            const request = store.get(setName);

            request.onerror = () => reject(request.error || new Error("Failed to read progress from IndexedDB."));
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.data : null);
            };
        });
    } catch (error) {
        console.error("getProgressFromDB failed:", error);
        return null;
    }
}

async function setProgressToDB(setName, progressData) {
    try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(PROGRESS_STORE_NAME, "readwrite");
            const store = tx.objectStore(PROGRESS_STORE_NAME);
            const request = store.put({
                setName: setName,
                data: progressData,
                lastUpdated: Date.now()
            });

            request.onerror = () => reject(request.error || new Error("Failed to write progress to IndexedDB."));

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("Progress transaction failed."));
        });
    } catch (error) {
        console.error("setProgressToDB failed:", error);
        throw error;
    }
}

// =====================================================
// SETTINGS STORAGE (IndexedDB)
// =====================================================

async function getSettingsFromDB() {
    try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(SETTINGS_STORE_NAME, "readonly");
            const store = tx.objectStore(SETTINGS_STORE_NAME);
            const request = store.get("settings");

            request.onerror = () => reject(request.error || new Error("Failed to read settings from IndexedDB."));
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.data : {});
            };
        });
    } catch (error) {
        console.error("getSettingsFromDB failed:", error);
        return {};
    }
}

async function setSettingsToDB(settingsData) {
    try {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const tx = db.transaction(SETTINGS_STORE_NAME, "readwrite");
            const store = tx.objectStore(SETTINGS_STORE_NAME);
            const request = store.put({
                key: "settings",
                data: settingsData,
                lastUpdated: Date.now()
            });

            request.onerror = () => reject(request.error || new Error("Failed to write settings to IndexedDB."));

            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error || new Error("Settings transaction failed."));
        });
    } catch (error) {
        console.error("setSettingsToDB failed:", error);
        throw error;
    }
}

// =====================================================
// SETTINGS LOAD/SAVE (Updated for IndexedDB)
// =====================================================

function getPreferredTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
}

function applyTheme(value) {
    themePreference = value || DEFAULT_THEME;
    document.body.classList.remove('theme-system', 'theme-light', 'theme-dark');
    document.body.classList.add(`theme-${themePreference}`);

    themeOptionInputs.forEach((input) => {
        input.checked = input.value === themePreference;
    });
}

function handleSystemThemeChange(event) {
    if (themePreference === 'system') {
        document.body.classList.remove('theme-light', 'theme-dark');
        document.body.classList.add('theme-system');
    }
}

async function deleteAppDatabase() {
    try {
        if (dbConnection) {
            dbConnection.close();
            dbConnection = null;
        }

        return new Promise((resolve, reject) => {
            const request = window.indexedDB.deleteDatabase(DB_NAME);
            request.onsuccess = () => resolve();
            request.onblocked = () => reject(new Error('Delete blocked by another open connection. Close other tabs first.'));
            request.onerror = () => reject(request.error || new Error('Failed to delete IndexedDB.'));
        });
    } catch (error) {
        console.error('deleteAppDatabase failed:', error);
        throw error;
    }
}

async function loadSettings() {
    try {
        const settings = await getSettingsFromDB();
        currentSet = settings.currentSet || 'body-parts';
        themePreference = settings.theme || DEFAULT_THEME;
        applyTheme(themePreference);
        cardSetSelect.value = currentSet;
    } catch (error) {
        console.error('Failed to load settings:', error);
        currentSet = 'body-parts';
        themePreference = DEFAULT_THEME;
        applyTheme(themePreference);
        cardSetSelect.value = currentSet;
    }
}

async function saveSettings() {
    try {
        await setSettingsToDB({
            currentSet: currentSet,
            theme: themePreference
        });
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

// =====================================================
// CARD SET LOADING
// =====================================================

async function loadCardSet() {
    try {
        cards = await initializeCardSet(currentSet);
    } catch (error) {
        console.error("Failed to load card set:", error);
        cards = [];
    }

    initializeMissingProgress();
    updateHomeStats();
}

function initializeMissingProgress() {

    for (const card of cards) {

        if (!progress[card.text]) {

            progress[card.text] = {

                stage: 0,

                nextReview: 0,

                correctCount: 0
            };
        }
    }

    saveProgress();
}

// =====================================================
// HELPERS
// =====================================================

function getCardProgress(text) {

    return progress[text];
}

function getStageName(stage) {

    switch (stage) {

        case 0:
            return "🆕 New";

        case 1:
            return "🔁 Repeat x1";

        case 2:
            return "🔁 Repeat x2";

        case 3:
            return "✅ Learned";

        default:
            return "Unknown";
    }
}

function getLearnedCount() {

    return Object.values(progress)
        .filter(p => p.stage === 3)
        .length;
}

function getReview1Count() {

    return Object.values(progress)
        .filter(p => p.stage === 1)
        .length;
}

function getReview2Count() {

    return Object.values(progress)
        .filter(p => p.stage === 2)
        .length;
}

function getNewCount() {

    return Object.values(progress)
        .filter(p => p.stage === 0)
        .length;
}

// =====================================================
// HOME SCREEN
// =====================================================

function updateHomeStats() {

    const total =
        cards.length;

    const learned =
        getLearnedCount();

    const percent =
        total === 0
            ? 0
            : Math.round(
                learned * 100 / total
            );

    progressFill.style.width =
        `${percent}%`;

    progressText.textContent =
        `${percent}% Complete`;

    updateNextReviewLabel();
}

// =====================================================
// NEXT REVIEW LABEL
// =====================================================

function updateNextReviewLabel() {

    const now = Date.now();

    let nearest = null;

    for (const item of Object.values(progress)) {

        if (
            item.stage < 3 &&
            item.nextReview > now
        ) {

            if (
                nearest === null ||
                item.nextReview < nearest
            ) {

                nearest =
                    item.nextReview;
            }
        }
    }

    if (nearest === null) {

        nextReviewTime.textContent =
            "Ready now";

        return;
    }

    const seconds =
        Math.max(
            0,
            Math.ceil(
                (nearest - now) / 1000
            )
        );

    nextReviewTime.textContent =
        `${seconds} sec`;
}

// =====================================================
// EVENTS
// =====================================================

cardSetSelect.addEventListener(
    "change",
    async () => {

        currentSet =
            cardSetSelect.value;

        updateDeleteCardsetButtonState();

        await saveSettings();

        await loadProgress();

        await loadCardSet();
    }
);

settingsBtn.addEventListener(
    "click",
    () => {
        showScreen(
            settingsScreen
        );
    }
);

settingsBackBtn.addEventListener(
    "click",
    () => {
        showScreen(
            homeScreen
        );
    }
);

deleteDatabaseBtn.addEventListener(
    "click",
    async () => {
        const confirmed = confirm(
            'Delete the saved app database? This will remove all stored progress and cardset data in IndexedDB.'
        );
        if (!confirmed) {
            return;
        }

        try {
            await deleteAppDatabase();
            setCachedDataVersion(0);
            alert('App database deleted. The app will reload to recreate fresh storage.');
            location.reload();
        } catch (error) {
            console.error('Unable to delete database:', error);
            alert('Could not delete the database. Close other tabs and try again.');
        }
    }
);

themeOptionInputs.forEach((input) => {
    input.addEventListener(
        "change",
        async (event) => {
            applyTheme(event.target.value);
            await saveSettings();
        }
    );
});

continueBtn.addEventListener(
    "click",
    () => {

        showScreen(
            learnScreen
        );

        startLearningSession();
    }
);

analyticsBtn.addEventListener(
    "click",
    () => {

        buildAnalytics();

        showScreen(
            analyticsScreen
        );
    }
);

backHomeBtn.addEventListener(
    "click",
    () => {

        showScreen(
            homeScreen
        );

        updateHomeStats();
    }
);

analyticsBackBtn.addEventListener(
    "click",
    () => {

        showScreen(
            homeScreen
        );
    }
);

resetBtn.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                `Reset progress for "${currentSet}"?`
            );

        if (!confirmed) {
            return;
        }

        progress = {};

        initializeMissingProgress();

        updateHomeStats();
    }
);

setupProgressBtn.addEventListener(
    "click",
    () => {
        openProgressSetupScreen();
    }
);

closeProgressSetupBtn.addEventListener(
    "click",
    () => {
        closeProgressSetupScreen();
    }
);

confirmSetupProgressBtn.addEventListener(
    "click",
    async () => {
        // Save the progress changes
        await saveProgress();

        // Clear the backup so closeProgressSetupScreen won't restore old state
        progressBackup = null;

        closeProgressSetupScreen();
        updateHomeStats();

        // Rebuild analytics if it's currently visible
        if (
            analyticsScreen
                .classList.contains("active")
        ) {
            buildAnalytics();
        }
    }
);

markAllNewBtn.addEventListener(
    "click",
    () => {
        markAllCardsAsNew();
    }
);

markAllLearningBtn.addEventListener(
    "click",
    () => {
        markAllCardsAsLearning();
    }
);

markAllLearnedBtn.addEventListener(
    "click",
    () => {
        markAllCardsAsLearned();
    }
);

exportProgressBtn.addEventListener(
    "click",
    () => {
        exportProgress();
    }
);

importProgressBtn.addEventListener(
    "click",
    () => {
        importProgressFile.click();
    }
);

importProgressFile.addEventListener(
    "change",
    (event) => {
        handleImportProgress(event);
    }
);

exportCardsetBtn.addEventListener(
    "click",
    () => {
        exportCardset();
    }
);

importCardsetBtn.addEventListener(
    "click",
    () => {
        importCardsetFile.click();
    }
);

deleteCardsetBtn.addEventListener(
    "click",
    () => {
        handleDeleteCardset();
    }
);

importCardsetFile.addEventListener(
    "change",
    (event) => {
        handleImportCardset(event);
    }
);

progressSearchInput.addEventListener(
    "input",
    (event) => {
        renderProgressCardList(event.target.value);
    }
);


// =====================================================
// CARD SELECTION
// =====================================================

function getDueCards() {

    const now = Date.now();

    return cards.filter(card => {

        if (sessionSkippedCards.has(card.text)) {
            return false;
        }

        const p =
            getCardProgress(card.text);

        if (!p) {
            return false;
        }

        if (p.stage >= 3) {
            return false;
        }

        return p.nextReview <= now;
    });
}

function getNextDueTimestamp() {

    let nextTime = null;

    for (const card of cards) {

        const p =
            getCardProgress(card.text);

        if (!p) {
            continue;
        }

        if (p.stage >= 3) {
            continue;
        }

        if (
            nextTime === null ||
            p.nextReview < nextTime
        ) {

            nextTime =
                p.nextReview;
        }
    }

    return nextTime;
}

function selectNextCard() {

    const dueCards =
        getDueCards();

    if (
        dueCards.length === 0
    ) {

        currentCard = null;

        showWaitingScreen();

        return;
    }

    dueCards.sort((a, b) => {

        const pa =
            getCardProgress(a.text);

        const pb =
            getCardProgress(b.text);

        return pa.stage - pb.stage;
    });

    currentCard =
        dueCards[0];

    showCurrentCard();
}

// =====================================================
// LEARNING SESSION
// =====================================================

function startLearningSession() {

    resultEl.textContent = "";
    recognizedText.textContent = "";

    sessionSkippedCards.clear();

    selectNextCard();
}

function showCurrentCard() {

    if (!currentCard) {
        return;
    }

    learnScreen.classList.remove("waiting");

    wrongAttempts = 0;

    const p =
        getCardProgress(
            currentCard.text
        );

    wordEl.textContent =
        currentCard.text;

    cardStatusEl.textContent =
        getStageName(
            p.stage
        );

    updateAttemptDisplay();

    resultEl.textContent = "";

    updateLearningProgress();

    updateSkipButtonState(true);

    speakWord(
        currentCard.text
    );
}

function updateAttemptDisplay() {
    if (!currentCard) {
        return;
    }

    const attemptsLeft =
        Math.max(0, MAX_WRONG_ATTEMPTS - wrongAttempts);

    const statusText =
        attemptsLeft > 0
            ? `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`
            : "No attempts left";

    recognizedText.textContent =
        listening
            ? `🎤 Listening... (${statusText})`
            : `Press Start Listening — ${statusText}`;
}

function updateLearningProgress() {

    const learned =
        getLearnedCount();

    learnProgress.textContent =
        `${learned} / ${cards.length} learned`;
}

function updateSkipButtonState(enabled) {

    nextBtn.disabled = !enabled;

}

// =====================================================
// CORRECT ANSWER
// =====================================================

function markCorrect(card) {

    const p =
        getCardProgress(card.text);

    const now =
        Date.now();

    if (p.stage === 0) {

        p.stage = 1;

        p.nextReview =
            now +
            REVIEW_1_DELAY;

    } else if (
        p.stage === 1
    ) {

        p.stage = 2;

        p.nextReview =
            now +
            REVIEW_2_DELAY;

    } else if (
        p.stage === 2
    ) {

        p.stage = 3;

        p.nextReview = 0;
    }

    p.correctCount++;

    saveProgress();

    updateHomeStats();

    resultEl.textContent =
        "✅ Correct";

    resultEl.className =
        "correct";

    setTimeout(() => {

        selectNextCard();

    }, 1500);
}

// =====================================================
// WRONG ANSWER
// =====================================================

function markWrong(card) {

    const p =
        getCardProgress(card.text);

    const now =
        Date.now();

    wrongAttempts++;

    if (
        p.stage > 0
    ) {

        p.stage--;
    }

    p.nextReview =
        now;

    saveProgress();

    updateHomeStats();

    if (wrongAttempts >= MAX_WRONG_ATTEMPTS) {
        const answerText =
            Array.isArray(card.answers)
                ? card.answers.join(", ")
                : String(card.answers || card.text);

        sessionSkippedCards.add(card.text);

        resultEl.textContent =
            `❌ Wrong — correct answer: ${answerText}`;

        resultEl.className =
            "wrong";

        recognizedText.textContent =
            "Moving to another card...";

        updateSkipButtonState(false);

        setTimeout(() => {
            selectNextCard();
        }, 5000);

        return;
    }

    resultEl.textContent =
        "❌ Wrong";

    resultEl.className =
        "wrong";

    updateAttemptDisplay();
}

// =====================================================
// SKIP BUTTON
// =====================================================

function skipCurrentCard() {

    if (!currentCard) {
        return;
    }

    const p =
        getCardProgress(
            currentCard.text
        );

    const now =
        Date.now();

    if (
        p.stage > 0
    ) {

        p.stage--;
    }

    p.nextReview =
        now;

    sessionSkippedCards.add(
        currentCard.text
    );

    saveProgress();

    updateHomeStats();

    const answerText =
        Array.isArray(currentCard.answers)
            ? currentCard.answers.join(", ")
            : String(currentCard.answers || currentCard.text);

    resultEl.textContent =
        `⏭ Skipped — correct answer: ${answerText}`;

    resultEl.className =
        "skipped";

    updateSkipButtonState(false);

    recognizedText.textContent =
        "Moving to another card...";

    setTimeout(() => {

        selectNextCard();

    }, 5000);
}

nextBtn.addEventListener(
    "click",
    skipCurrentCard
);

// =====================================================
// WAITING SCREEN
// =====================================================

let waitingTimer = null;

function showWaitingScreen() {

    stopListening();

    learnScreen.classList.add("waiting");

    wordEl.textContent =
        "🎉 Great job!";

    cardStatusEl.textContent =
        "No cards are due";

    resultEl.textContent = "";

    updateLearningProgress();

    updateSkipButtonState(false);

    if (
        waitingTimer
    ) {

        clearInterval(
            waitingTimer
        );
    }

    updateWaitingDisplay();

    waitingTimer =
        setInterval(
            updateWaitingDisplay,
            1000
        );
}

function updateWaitingDisplay() {

    const nextTime =
        getNextDueTimestamp();

    if (
        nextTime === null
    ) {

        recognizedText.textContent =
            "All cards learned 🎉";

        clearInterval(
            waitingTimer
        );

        return;
    }

    const now =
        Date.now();

    const remaining =
        Math.max(
            0,
            Math.ceil(
                (
                    nextTime - now
                ) / 1000
            )
        );

    recognizedText.textContent =
        `⏳ Next review in ${remaining} sec`;

    if (
        remaining <= 0
    ) {

        clearInterval(
            waitingTimer
        );

        selectNextCard();
    }
}

// =====================================================
// ANSWER CHECKING
// =====================================================

function normalize(text) {

    return text
        .toLowerCase()
        .trim()
        .replace(
            /[.,!?]/g,
            ""
        );
}

function checkAnswer(text) {

    if (
        !currentCard
    ) {

        return;
    }

    const spoken =
        normalize(text);

    const answers =
        currentCard.answers.map(
            normalize
        );

    if (
        answers.includes(
            spoken
        )
    ) {

        markCorrect(
            currentCard
        );

    } else {

        markWrong(
            currentCard
        );
    }
}

// =====================================================
// SPEECH SYNTHESIS
// =====================================================

speechSynthesis.getVoices();

speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
};

function getEnglishVoice() {

    const voices =
        speechSynthesis.getVoices();

    let voice =
        voices.find(v =>
            v.lang === "en-US"
        );

    if (voice) {
        return voice;
    }

    voice =
        voices.find(v =>
            v.lang.startsWith("en")
        );

    return voice || null;
}

function speakWord(text) {

    if (!text) {
        return;
    }

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(
            text
        );

    const voice =
        getEnglishVoice();

    if (voice) {
        utterance.voice =
            voice;
    }

    utterance.lang =
        "en-US";

    utterance.rate =
        0.9;

    utterance.pitch =
        1;

    speechSynthesis.speak(
        utterance
    );
}

// =====================================================
// REPEAT BUTTON
// =====================================================

speakBtn.addEventListener(
    "click",
    () => {

        if (
            currentCard
        ) {

            speakWord(
                currentCard.text
            );
        }
    }
);

// =====================================================
// SPEECH RECOGNITION
// =====================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (!SpeechRecognition) {

    listenBtn.disabled =
        true;

    recognizedText.textContent =
        "Speech recognition not supported";

} else {

    recognition =
        new SpeechRecognition();

    recognition.lang =
        "ru-RU";

    recognition.interimResults =
        false;

    recognition.maxAlternatives =
        1;

    // ==========================================
    // RESULT
    // ==========================================

    recognition.onresult =
        event => {

            const transcript =
                event.results[0][0]
                .transcript;

            recognizedText.textContent =
                `You said: ${transcript}`;

            checkAnswer(
                transcript
            );
        };

    // ==========================================
    // ERRORS
    // ==========================================

    recognition.onerror =
        event => {

            if (
                event.error ===
                "no-speech"
            ) {

                return;
            }

            console.log(
                "Speech error:",
                event.error
            );

            recognizedText.textContent =
                `Error: ${event.error}`;
        };

    // ==========================================
    // AUTO RESTART
    // ==========================================

    recognition.onend =
        () => {

            if (
                listening
            ) {

                try {

                    recognition.start();

                } catch (e) {

                    // browser may throw
                    // if already started
                }
            }
        };

    // ==========================================
    // LISTEN BUTTON
    // ==========================================

    listenBtn.addEventListener(
        "click",
        () => {

            if (
                !listening
            ) {

                startListening();

            } else {

                stopListening();
            }
        }
    );
}

// =====================================================
// LISTENING CONTROL
// =====================================================

function startListening() {

    if (
        !recognition
    ) {

        return;
    }

    listening =
        true;

    listenBtn.textContent =
        "⏹ Stop Listening";

    listenBtn.classList.add(
        "listening"
    );

    updateAttemptDisplay();

    try {

        recognition.start();

    } catch (e) {

        // ignore
    }
}

function stopListening() {

    if (
        !recognition
    ) {

        return;
    }

    listening =
        false;

    listenBtn.textContent =
        "🎤 Start Listening";

    listenBtn.classList.remove(
        "listening"
    );

    updateAttemptDisplay();

    try {

        recognition.stop();

    } catch (e) {

        // ignore
    }
}

// =====================================================
// STOP LISTENING WHEN LEAVING
// =====================================================

backHomeBtn.addEventListener(
    "click",
    () => {

        stopListening();
    }
);

analyticsBackBtn.addEventListener(
    "click",
    () => {

        stopListening();
    }
);

// =====================================================
// OPTIONAL AUTO-LISTEN
// =====================================================

// If you want the microphone
// to start automatically
// every time user enters
// learning mode, uncomment:
//
// continueBtn.addEventListener(
//     "click",
//     () => {
//         startListening();
//     }
// );

// =====================================================
// ANALYTICS
// =====================================================

function buildAnalytics() {

    document.getElementById(
        "analyticsLearned"
    ).textContent =
        getLearnedCount();

    document.getElementById(
        "analyticsStage1"
    ).textContent =
        getReview1Count();

    document.getElementById(
        "analyticsStage2"
    ).textContent =
        getReview2Count();

    document.getElementById(
        "analyticsNew"
    ).textContent =
        getNewCount();

    const tbody =
        document.querySelector(
            "#analyticsTable tbody"
        );

    tbody.innerHTML = "";

    const sortedCards =
        [...cards].sort(
            (a, b) =>
                a.text.localeCompare(
                    b.text
                )
        );

    for (const card of sortedCards) {

        const p =
            getCardProgress(
                card.text
            );

        const row =
            document.createElement(
                "tr"
            );

        const wordCell =
            document.createElement(
                "td"
            );

        wordCell.textContent =
            card.text;

        const statusCell =
            document.createElement(
                "td"
            );

        let statusText =
            "";

        let className =
            "";

        switch (
            p.stage
        ) {

            case 0:

                statusText =
                    "🆕 New";

                className =
                    "status-new";

                break;

            case 1:

                statusText =
                    "🔁 Repeat x1";

                className =
                    "status-review1";

                break;

            case 2:

                statusText =
                    "🔁 Repeat x2";

                className =
                    "status-review2";

                break;

            case 3:

                statusText =
                    "✅ Learned";

                className =
                    "status-learned";

                break;
        }

        statusCell.textContent =
            statusText;

        statusCell.className =
            className;

        row.appendChild(
            wordCell
        );

        row.appendChild(
            statusCell
        );

        const answerCell =
            document.createElement(
                "td"
            );

        answerCell.textContent =
            Array.isArray(card.answers)
                ? card.answers.join(", ")
                : String(card.answers || "");

        row.appendChild(
            answerCell
        );

        tbody.appendChild(
            row
        );
    }
}

// =====================================================
// HOME SCREEN AUTO REFRESH
// =====================================================

setInterval(
    () => {

        if (
            homeScreen.classList.contains(
                "active"
            )
        ) {

            updateNextReviewLabel();
        }

    },
    1000
);

// =====================================================
// AUTO REFRESH LEARNING SCREEN
// =====================================================

setInterval(
    () => {

        if (
            !learnScreen.classList.contains(
                "active"
            )
        ) {

            return;
        }

        if (
            currentCard
        ) {

            return;
        }

        const nextDue =
            getNextDueTimestamp();

        if (
            nextDue === null
        ) {

            return;
        }

        if (
            nextDue <= Date.now()
        ) {

            selectNextCard();
        }

    },
    1000
);

// =====================================================
// PROGRESS SETUP SCREEN
// =====================================================

let progressBackup = null;

let progressSetupPreviousScreen = analyticsScreen;

function openProgressSetupScreen() {

    // Save current progress state before making changes
    progressBackup =
        JSON.parse(
            JSON.stringify(progress)
        );

    renderProgressCardList("");
    progressSearchInput.value = "";
    progressSetupPreviousScreen = analyticsScreen;
    showScreen(progressSetupScreen);
}

function closeProgressSetupScreen() {

    // Restore progress if no changes were confirmed
    if (progressBackup !== null) {
        progress = progressBackup;
        progressBackup = null;
    }

    showScreen(progressSetupPreviousScreen);
}

function markAllCardsAsNew() {

    const confirmed =
        confirm(
            "Mark all cards as new? This will reset progress for all cards."
        );

    if (!confirmed) {
        return;
    }

    for (const card of cards) {

        progress[card.text] = {
            stage: 0,
            nextReview: 0,
            correctCount: 0
        };
    }

    renderProgressCardList("");
}

function markAllCardsAsLearning() {

    const confirmed =
        confirm(
            "Mark all cards as learning (Stage 1)?"
        );

    if (!confirmed) {
        return;
    }

    const now = Date.now();

    for (const card of cards) {

        progress[card.text] = {
            stage: 1,
            nextReview: now,
            correctCount: 1
        };
    }

    renderProgressCardList("");
}

function markAllCardsAsLearned() {

    const confirmed =
        confirm(
            "Mark all cards as learned? You can always undo this."
        );

    if (!confirmed) {
        return;
    }

    for (const card of cards) {

        progress[card.text] = {
            stage: 3,
            nextReview: 0,
            correctCount: 3
        };
    }

    renderProgressCardList("");
}

function renderProgressCardList(searchTerm = "") {

    const filteredCards =
        cards.filter(card =>
            card.text
                .toLowerCase()
                .includes(
                    searchTerm.toLowerCase()
                )
        );

    progressCardList.innerHTML = "";

    for (const card of filteredCards) {

        const p =
            getCardProgress(card.text);

        const item =
            document.createElement("div");

        item.className =
            "progress-card-item";

        const info =
            document.createElement("div");

        info.className =
            "progress-card-info";

        const wordDiv =
            document.createElement("div");

        wordDiv.className =
            "progress-card-text";

        wordDiv.textContent =
            card.text;

        const statusDiv =
            document.createElement("div");

        statusDiv.className =
            "progress-card-status";

        statusDiv.textContent =
            getStageName(p.stage) +
            " (Correct: " +
            p.correctCount +
            ")";

        info.appendChild(wordDiv);
        info.appendChild(statusDiv);

        const controls =
            document.createElement("div");

        controls.className =
            "progress-card-controls";

        const select =
            document.createElement("select");

        const stages = [
            { value: 0, label: "🆕 New" },
            { value: 1, label: "🔁 Repeat x1" },
            { value: 2, label: "🔁 Repeat x2" },
            { value: 3, label: "✅ Learned" }
        ];

        for (const stage of stages) {

            const option =
                document.createElement("option");

            option.value = stage.value;
            option.textContent = stage.label;
            option.selected =
                p.stage === stage.value;

            select.appendChild(option);
        }

        select.addEventListener(
            "change",
            (event) => {

                const newStage =
                    parseInt(
                        event.target.value
                    );

                p.stage = newStage;
                p.nextReview = 0;

                if (newStage > 0) {
                    p.nextReview =
                        Date.now();
                }

                renderProgressCardList(
                    progressSearchInput.value
                );
            }
        );

        controls.appendChild(select);

        item.appendChild(info);
        item.appendChild(controls);

        progressCardList.appendChild(item);
    }

    if (filteredCards.length === 0) {

        const emptyMsg =
            document.createElement("div");

        emptyMsg.style.padding =
            "20px";

        emptyMsg.style.textAlign =
            "center";

        emptyMsg.style.color =
            "var(--muted)";

        emptyMsg.textContent =
            "No cards found";

        progressCardList.appendChild(
            emptyMsg
        );
    }
}

function exportProgress() {

    const dataToExport = {

        setName: currentSet,
        timestamp: new Date().toISOString(),
        progress: progress,
        cards: cards
    };

    const json =
        JSON.stringify(
            dataToExport,
            null,
            2
        );

    const blob =
        new Blob(
            [json],
            { type: "application/json" }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download =
        `${currentSet}-progress-${
            new Date()
                .toISOString()
                .split("T")[0]
        }.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

function handleImportProgress(event) {

    const file =
        event.target.files[0];

    if (!file) {
        return;
    }

    const reader =
        new FileReader();

    reader.onload = async (e) => {

        try {

            const data =
                JSON.parse(
                    e.target.result
                );

            if (!data.progress) {

                alert(
                    "Invalid progress file"
                );

                return;
            }

            const confirmed =
                confirm(
                    `Import progress from "${
                        data.setName
                    }"? This will overwrite current progress.`
                );

            if (!confirmed) {
                return;
            }

            progress = data.progress;
            await saveProgress();

            renderProgressCardList("");

            alert(
                "Progress imported successfully!"
            );

        } catch (error) {

            alert(
                "Error reading file: " +
                error.message
            );
        }
    };

    reader.readAsText(file);

    // Reset file input
    event.target.value = "";
}

// =====================================================
// DEBUG HELPERS
// =====================================================

// Uncomment for testing:
//
// window.resetAllProgress = () => {
//     localStorage.clear();
//     location.reload();
// };
//
// window.showProgress = () => {
//     console.log(progress);
// };

// =====================================================
// APP STARTUP
// =====================================================

async function init() {

    await loadSettings();

    await refreshCardSetOptions();

    await loadProgress();

    await loadCardSet();

    updateHomeStats();

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener(
            'change',
            handleSystemThemeChange
        );
    }

    showScreen(
        homeScreen
    );
}

init();
