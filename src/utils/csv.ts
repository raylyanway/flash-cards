import papaparse from "papaparse";
import type {
  Card,
  LibraryImportRow,
  LibraryRow,
  ParsedRow,
  ParseOptions,
  ProgressMap,
} from "../types";
import { MASTERED_STAGE } from "./cardProgress";

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

function serializeLibraryAnswers(value: unknown) {
  if (typeof value === "string" && value.includes("|")) {
    return JSON.stringify([value]);
  }
  if (Array.isArray(value)) {
    const joined = value.join("|");
    if (
      value.some(
        (answer) => typeof answer !== "string" || answer.includes("|"),
      ) ||
      joined.trimStart().startsWith("[") ||
      joined.trimStart().startsWith("{")
    ) {
      return JSON.stringify(value);
    }
    return joined;
  }
  return serializeLibraryCell(value);
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
  const headers = ["text", "stage", "review"];
  return papaparse.unparse(
    cards.map((card) => {
      const progressEntry = progressData[card.group ?? ""]?.[card.text] || {
        stage: 0,
        review: 0,
      };
      return {
        text: card.text,
        stage: progressEntry.stage,
        review: progressEntry.review,
      };
    }),
    { columns: headers },
  );
}

export function createCsvFromLibrary(rows: LibraryRow[]) {
  const contentFields = new Set<string>();
  for (const row of rows) {
    Object.keys(row.content).forEach((key) => {
      if (key !== "isBuiltIn") contentFields.add(key);
    });
  }

  const preferredOrder = ["group", "text", "answers", "stage", "review"];
  const headers = [
    ...preferredOrder.filter(
      (key) => key === "stage" || key === "review" || contentFields.has(key),
    ),
    ...[...contentFields].filter((key) => !preferredOrder.includes(key)),
  ];

  return papaparse.unparse(
    rows.map(({ content, progress }) => {
      const row: Record<string, unknown> = {
        ...content,
        stage: progress.stage,
        review: progress.review,
      };
      return Object.fromEntries(
        headers.map((key) => [
          key,
          (key === "answers"
            ? serializeLibraryAnswers(row[key])
            : serializeLibraryCell(row[key])) ?? "",
        ]),
      );
    }),
    { columns: headers },
  );
}

export function parseLibraryCsv(
  csvText: string,
  targetGroup?: string,
  excludedGroups: readonly string[] = [],
): LibraryImportRow[] {
  const { data, errors, meta } = papaparse.parse<Record<string, string>>(
    csvText,
    { header: true, skipEmptyLines: "greedy" },
  );
  const headers = meta.fields || [];
  const isIgnoredGroup = (group: string | undefined) =>
    group !== undefined &&
    (excludedGroups.includes(group.trim()) ||
      Boolean(
        targetGroup &&
        headers.includes("group") &&
        group.trim() !== targetGroup,
      ));
  const relevantError = errors.find((error) => {
    if (
      !headers.includes("group") ||
      error.type !== "FieldMismatch" ||
      typeof error.row !== "number"
    ) {
      return true;
    }
    const group = data[error.row]?.group;
    return !isIgnoredGroup(group);
  });
  if (relevantError) {
    throw new Error(`Failed to parse CSV: ${relevantError.message}`);
  }
  if (data.length === 0) {
    throw new Error("CSV file is empty or missing a header row.");
  }

  const requiredHeaders = targetGroup
    ? ["text", "answers"]
    : ["group", "text", "answers"];
  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      throw new Error(
        `Validation Error: The CSV file is missing the required '${required}' column.`,
      );
    }
  }

  const matchingRows = data
    .map((rawRow, index) => ({ rawRow, index }))
    .filter(({ rawRow }) => !isIgnoredGroup(rawRow.group));
  if (matchingRows.length === 0) {
    throw new Error(
      targetGroup
        ? `CSV contains no rows for group '${targetGroup}'.`
        : "CSV contains no importable rows.",
    );
  }

  return matchingRows.map(({ rawRow, index }) => {
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
    const group =
      targetGroup ?? (typeof row.group === "string" ? row.group : "");
    const text = typeof row.text === "string" ? row.text : "";
    if (!group.trim() || !text.trim()) {
      throw new Error(`CSV row ${index + 2} must include a group and text.`);
    }
    const answers =
      typeof row.answers === "string" && row.answers.includes("|")
        ? row.answers.split("|").map((answer) => answer.trim())
        : row.answers;
    if (
      !(
        (typeof answers === "string" && answers.trim()) ||
        (Array.isArray(answers) &&
          answers.length > 0 &&
          answers.every(
            (answer) => typeof answer === "string" && answer.trim(),
          ))
      )
    ) {
      throw new Error(
        `CSV row ${index + 2} must include at least one non-empty answer.`,
      );
    }
    row.answers = answers;

    const card: Card = { group, text };
    for (const [key, value] of Object.entries(row)) {
      if (
        [
          "group",
          "text",
          "isBuiltIn",
          "stage",
          "review",
          "progressCorrectCount",
        ].includes(key)
      ) {
        continue;
      }
      card[key] = value;
    }

    const progress: LibraryImportRow["progress"] = {};
    const progressFields = [
      ["stage", "stage"],
      ["review", "review"],
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
    if (progress.stage !== undefined && progress.stage > MASTERED_STAGE) {
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
