import papaparse from "papaparse";
import { Card, ParsedRow, ParseOptions, ProgressMap } from "../types";

const CSV_DELIMITER = ",";

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
    {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
    },
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
      const cleanValue = rawValue.trim();

      if (cleanValue.includes("|")) {
        record[key] = cleanValue
          .split("|")
          .map((part) => part.trim())
          .filter(Boolean);
      } else {
        record[key] = cleanValue;
      }
    }

    return record;
  });
}
