import papaparse from "papaparse";
import type {
  Card,
  LibraryImportRow,
  LibraryRow,
  ParsedRow,
  ParseOptions,
  ProgressMap,
} from "../types";

export function downloadCsv(csvText: string, fileName: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function serializeCellValue(value: unknown) {
  if (Array.isArray(value)) return value.join("|");
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return value;
}

function serializeLibraryCell(value: unknown) {
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return value;
}

export function createCsvFromCards(cards: Card[]) {
  const fieldSet = new Set<string>();
  for (const card of cards) {
    Object.keys(card).forEach((key) => {
      if (key !== "group") fieldSet.add(key);
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

  return papaparse.unparse(
    cards.map((card) =>
      Object.fromEntries(
        headers.map((key) => [key, serializeCellValue(card[key])]),
      ),
    ),
    { columns: headers },
  );
}

export function createCsvFromProgress(
  progressData: ProgressMap,
  cards: Card[],
) {
  const headers = ["text", "stage", "nextReview", "correctCount"];
  return papaparse.unparse(
    cards.map((card) => {
      const progressEntry = progressData[card.group ?? ""]?.[card.text] || {
        stage: 0,
        nextReview: 0,
        correctCount: 0,
      };
      return {
        text: card.text,
        stage: progressEntry.stage,
        nextReview: progressEntry.nextReview,
        correctCount: progressEntry.correctCount,
      };
    }),
    { columns: headers },
  );
}

export function createCsvFromLibrary(rows: LibraryRow[]) {
  const contentFields = new Set<string>();
  for (const row of rows) {
    Object.keys(row.content).forEach((key) => contentFields.add(key));
  }

  const preferredOrder = [
    "group",
    "isBuiltIn",
    "text",
    "answers",
    "progressStage",
    "progressNextReview",
    "progressCorrectCount",
  ];
  const headers = [
    ...preferredOrder.filter(
      (key) =>
        key === "isBuiltIn" ||
        key === "progressStage" ||
        key === "progressNextReview" ||
        key === "progressCorrectCount" ||
        contentFields.has(key),
    ),
    ...[...contentFields].filter((key) => !preferredOrder.includes(key)),
  ];

  return papaparse.unparse(
    rows.map(({ content, progress, isBuiltIn }) => {
      const row: Record<string, unknown> = {
        ...content,
        isBuiltIn,
        progressStage: progress.stage,
        progressNextReview: progress.nextReview,
        progressCorrectCount: progress.correctCount,
      };
      return Object.fromEntries(
        headers.map((key) => [key, serializeLibraryCell(row[key]) ?? ""]),
      );
    }),
    { columns: headers },
  );
}

export function parseLibraryCsv(csvText: string): LibraryImportRow[] {
  const { data, errors, meta } = papaparse.parse<Record<string, string>>(
    csvText,
    { header: true, skipEmptyLines: "greedy" },
  );
  if (errors.length > 0) {
    throw new Error(`Failed to parse CSV: ${errors[0].message}`);
  }
  if (data.length === 0) {
    throw new Error("CSV file is empty or missing a header row.");
  }

  const headers = meta.fields || [];
  for (const required of ["group", "text"]) {
    if (!headers.includes(required)) {
      throw new Error(
        `Validation Error: The CSV file is missing the required '${required}' column.`,
      );
    }
  }

  return data.map((rawRow, index) => {
    const row = Object.fromEntries(
      Object.entries(rawRow).map(([key, value]) => {
        if (value === undefined || value === null) return [key, ""];
        if (
          !["group", "text", "isBuiltIn"].includes(key) &&
          (value.trimStart().startsWith("{") ||
            value.trimStart().startsWith("["))
        ) {
          try {
            return [key, JSON.parse(value) as unknown];
          } catch {
            return [key, value];
          }
        }
        return [key, value];
      }),
    ) as Record<string, unknown>;
    const group = typeof row.group === "string" ? row.group : "";
    const text = typeof row.text === "string" ? row.text : "";
    if (!group.trim() || !text.trim()) {
      throw new Error(`CSV row ${index + 2} must include a group and text.`);
    }

    const card: Card = { group, text };
    for (const [key, value] of Object.entries(row)) {
      if (
        [
          "group",
          "text",
          "isBuiltIn",
          "progressStage",
          "progressNextReview",
          "progressCorrectCount",
        ].includes(key)
      ) {
        continue;
      }
      card[key] = value;
    }

    const progress: LibraryImportRow["progress"] = {};
    const progressFields = [
      ["stage", "progressStage"],
      ["nextReview", "progressNextReview"],
      ["correctCount", "progressCorrectCount"],
    ] as const;
    for (const [field, csvField] of progressFields) {
      const value = row[csvField];
      if (value === undefined || value === "") continue;
      if (
        (typeof value !== "string" && typeof value !== "number") ||
        !/^\d+$/.test(String(value)) ||
        !Number.isSafeInteger(Number(value))
      ) {
        throw new Error(`CSV row ${index + 2} has an invalid ${field} value.`);
      }
      progress[field] = Number(value);
    }
    if (progress.stage !== undefined && progress.stage > 3) {
      throw new Error(`CSV row ${index + 2} has an invalid stage value.`);
    }

    return {
      group,
      card,
      ...(Object.keys(progress).length ? { progress } : {}),
    };
  });
}

/**
 * Parses any raw CSV text into an array of abstract objects.
 * Automatically converts pipe-separated values (|) into native arrays.
 */
export function parseCsv(
  csvText: string,
  options: ParseOptions = {},
): ParsedRow[] {
  const { data, errors, meta } = papaparse.parse<Record<string, string>>(
    csvText,
    { header: true, skipEmptyLines: "greedy" },
  );

  if (errors.length > 0) {
    throw new Error(`Failed to parse CSV: ${errors[0].message}`);
  }

  if (data.length === 0) {
    throw new Error("CSV file is empty or missing a header row.");
  }

  const headers = meta.fields || [];
  if (options.requiredHeaders) {
    for (const required of options.requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(
          `Validation Error: The CSV file is missing the required '${required}' column.`,
        );
      }
    }
  }

  return data.map((row) => {
    const record: ParsedRow = {};

    for (const [key, rawValue] of Object.entries(row)) {
      if (rawValue === undefined || rawValue === null) {
        record[key] = "";
        continue;
      }

      if (rawValue.includes("|")) {
        record[key] = rawValue
          .split("|")
          .map((part) => part)
          .filter(Boolean);
      } else {
        record[key] = rawValue;
      }
    }

    return record;
  });
}
