import papaparse from "papaparse";
import type { Card, ParsedRow, ParseOptions, ProgressMap } from "../types";

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
      const progressEntry = progressData[card.text] || {
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
