import {
  DeleteOutlineRounded,
  FileDownloadRounded,
  FileUploadRounded,
  RestartAltRounded,
} from "@mui/icons-material";
import { Autocomplete, TextField } from "@mui/material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { deleteLibraryRows, getLibraryRows, importLibraryRows } from "../../db";
import { useAppStore } from "../../store/useAppStore";
import type { LibraryRow, ProgressMap } from "../../types";
import { getStageName } from "../../utils/cardProgress";
import {
  createCsvFromLibrary,
  downloadCsv,
  parseLibraryCsv,
} from "../../utils/csv";

function getRowKey(row: LibraryRow) {
  return JSON.stringify([row.content.group, row.content.text]);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatReviewDate(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "Not scheduled";
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function formatRowDetails(row: LibraryRow) {
  const contentDetails = Object.entries(row.content)
    .filter(([field]) => field !== "text")
    .map(([field, value]) => `${field}: ${formatValue(value)}`)
    .filter((detail) => !detail.endsWith(": "));
  const progressDetails = [
    `stage: ${row.progress.stage} (${getStageName(row.progress.stage)})`,
    `nextReview: ${formatReviewDate(row.progress.nextReview)}`,
    `correctCount: ${row.progress.correctCount}`,
  ];
  return [...contentDetails, ...progressDetails].join(" · ");
}

export function LibraryList() {
  const progress = useAppStore((state) => state.progress);
  const contentOptions = useAppStore((state) => state.contentOptions);
  const currentGroup = useAppStore((state) => state.currentGroup);
  const loadGroupData = useAppStore((state) => state.loadGroupData);
  const setProgress = useAppStore((state) => state.setProgress);
  const refreshContentOptions = useAppStore(
    (state) => state.refreshContentOptions,
  );

  const importInputRef = React.useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = React.useState<LibraryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isUpdatingSelection, setIsUpdatingSelection] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState("all");
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<Set<string>>(
    new Set(),
  );

  const filteredRows = React.useMemo(
    () =>
      selectedGroup === "all"
        ? rows
        : rows.filter((row) => row.content.group === selectedGroup),
    [rows, selectedGroup],
  );
  const groupFilterOptions = React.useMemo(
    () => [{ key: "all", label: "All groups" }, ...contentOptions],
    [contentOptions],
  );
  const selectedGroupOption =
    groupFilterOptions.find((option) => option.key === selectedGroup) ??
    groupFilterOptions[0];
  const selectedRows = React.useMemo(
    () => rows.filter((row) => selectedRowKeys.has(getRowKey(row))),
    [rows, selectedRowKeys],
  );
  const selectedFilteredCount = filteredRows.filter((row) =>
    selectedRowKeys.has(getRowKey(row)),
  ).length;
  const allFilteredSelected =
    filteredRows.length > 0 && selectedFilteredCount === filteredRows.length;
  const someFilteredSelected =
    selectedFilteredCount > 0 && !allFilteredSelected;
  const removableRows = selectedRows.filter((row) => !row.isBuiltIn);

  const toggleRowSelection = (row: LibraryRow, checked: boolean) => {
    const key = getRowKey(row);
    setSelectedRowKeys((previous) => {
      const next = new Set(previous);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleFilteredSelection = (checked: boolean) => {
    setSelectedRowKeys((previous) => {
      const next = new Set(previous);
      for (const row of filteredRows) {
        const key = getRowKey(row);
        if (checked) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  React.useEffect(() => {
    let active = true;

    getLibraryRows(progress)
      .then((libraryRows) => {
        if (active) setRows(libraryRows);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : String(loadError),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [progress]);

  const exportLibrary = () => {
    try {
      setError(null);
      if (!rows.length) {
        setError("There is no library data to export.");
        return;
      }
      downloadCsv(
        createCsvFromLibrary(rows),
        `library-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (exportError) {
      console.error("Failed to export library:", exportError);
      setError("Unable to export the library. See console for details.");
    }
  };

  const exportSelectedRows = () => {
    try {
      setError(null);
      if (selectedRows.length === 0) return;
      downloadCsv(
        createCsvFromLibrary(selectedRows),
        `library-selected-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (exportError) {
      console.error("Failed to export selected library rows:", exportError);
      setError("Unable to export the selected rows. See console for details.");
    }
  };

  const resetSelectedProgress = async () => {
    setError(null);
    setMessage(null);
    setIsUpdatingSelection(true);

    try {
      const nextProgress: ProgressMap = {};
      for (const row of selectedRows) {
        const group = row.content.group;
        if (!nextProgress[group]) {
          nextProgress[group] = Object.fromEntries(
            rows
              .filter((libraryRow) => libraryRow.content.group === group)
              .map((libraryRow) => [
                libraryRow.content.text,
                progress[group]?.[libraryRow.content.text] ??
                  libraryRow.progress,
              ]),
          );
        }
        nextProgress[group][row.content.text] = {
          stage: 0,
          nextReview: 0,
          correctCount: 0,
        };
      }

      await setProgress(nextProgress);
      if (nextProgress[currentGroup]) await loadGroupData(currentGroup);
      setRows(
        await getLibraryRows({
          ...progress,
          ...nextProgress,
        }),
      );
      setSelectedRowKeys(new Set());
      setMessage(
        `Reset progress for ${selectedRows.length} selected card${selectedRows.length === 1 ? "" : "s"}.`,
      );
    } catch (resetError) {
      console.error("Failed to reset selected library progress:", resetError);
      setError(
        resetError instanceof Error
          ? `Unable to reset selected progress: ${resetError.message}`
          : "Unable to reset selected progress.",
      );
    } finally {
      setIsUpdatingSelection(false);
    }
  };

  const removeSelectedRows = async () => {
    if (removableRows.length === 0) return;
    const confirmed = window.confirm(
      `Permanently delete ${removableRows.length} imported card${removableRows.length === 1 ? "" : "s"} and their progress? Built-in cards will be kept.`,
    );
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    setIsUpdatingSelection(true);

    try {
      const removedKeys = new Set(removableRows.map(getRowKey));
      const affectedGroups = new Set(
        removableRows.map((row) => row.content.group),
      );
      const nextProgress: ProgressMap = {};
      for (const group of affectedGroups) {
        nextProgress[group] = Object.fromEntries(
          rows
            .filter(
              (row) =>
                row.content.group === group && !removedKeys.has(getRowKey(row)),
            )
            .map((row) => [
              row.content.text,
              progress[group]?.[row.content.text] ?? row.progress,
            ]),
        );
      }

      await deleteLibraryRows(
        removableRows.map((row) => ({
          group: row.content.group,
          text: row.content.text,
        })),
      );
      await setProgress(nextProgress);
      if (nextProgress[currentGroup]) await loadGroupData(currentGroup);
      setRows(
        await getLibraryRows({
          ...progress,
          ...nextProgress,
        }),
      );
      setSelectedRowKeys(new Set());
      const keptBuiltInCount = selectedRows.length - removableRows.length;
      setMessage(
        `Deleted ${removableRows.length} imported card${removableRows.length === 1 ? "" : "s"} and their progress.${keptBuiltInCount > 0 ? ` ${keptBuiltInCount} built-in card${keptBuiltInCount === 1 ? " was" : "s were"} kept.` : ""}`,
      );
    } catch (deleteError) {
      console.error("Failed to remove selected library rows:", deleteError);
      setError(
        deleteError instanceof Error
          ? `Unable to remove selected rows: ${deleteError.message}`
          : "Unable to remove selected rows.",
      );
    } finally {
      setIsUpdatingSelection(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setMessage(null);

    try {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        throw new Error("Please upload a .csv file only.");
      }
      const importedRows = parseLibraryCsv(await file.text());
      if (
        !window.confirm(
          `Import ${importedRows.length} library rows? Matching cards and their progress will be overwritten; other rows will be kept.`,
        )
      ) {
        return;
      }

      setIsImporting(true);
      const importedProgress = await importLibraryRows(importedRows);
      await setProgress(importedProgress);
      if (importedRows.some((row) => row.group === currentGroup)) {
        await loadGroupData(currentGroup);
      }
      await refreshContentOptions(currentGroup);
      const nextRows = await getLibraryRows({
        ...progress,
        ...importedProgress,
      });
      setRows(nextRows);
      setSelectedRowKeys(new Set());
      setMessage(`Imported ${importedRows.length} library rows.`);
    } catch (importError) {
      console.error("Failed to import library:", importError);
      setError(
        importError instanceof Error
          ? `Unable to import the library: ${importError.message}`
          : "Unable to import the library. See console for details.",
      );
    } finally {
      setIsImporting(false);
      event.target.value = "";
    }
  };

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{
          alignItems: { sm: "center" },
          justifyContent: "space-between",
          p: 1,
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Autocomplete
            size="small"
            sx={{ minWidth: 220 }}
            options={groupFilterOptions}
            value={selectedGroupOption}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.key === value.key}
            onChange={(_, option) => {
              setSelectedGroup(option?.key ?? "all");
              setSelectedRowKeys(new Set());
            }}
            renderInput={(params) => (
              <TextField {...params} label="Filter by group" />
            )}
          />
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            {selectedRows.length > 0 && (
              <>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ alignSelf: "center", whiteSpace: "nowrap" }}
                >
                  {selectedRows.length} selected
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<RestartAltRounded />}
                  disabled={isImporting || isUpdatingSelection}
                  onClick={() => void resetSelectedProgress()}
                >
                  Reset progress
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadRounded />}
                  disabled={isImporting || isUpdatingSelection}
                  onClick={exportSelectedRows}
                >
                  Export selected
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteOutlineRounded />}
                  disabled={
                    removableRows.length === 0 ||
                    isImporting ||
                    isUpdatingSelection
                  }
                  onClick={() => void removeSelectedRows()}
                >
                  Remove
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              startIcon={<FileUploadRounded />}
              disabled={isImporting || isUpdatingSelection}
              onClick={() => importInputRef.current?.click()}
            >
              Import CSV
            </Button>
            <input
              ref={importInputRef}
              type="file"
              hidden
              accept=".csv,text/csv"
              onChange={(event) => void handleImport(event)}
            />
            <Button
              variant="outlined"
              startIcon={<FileDownloadRounded />}
              onClick={exportLibrary}
            >
              Export CSV
            </Button>
          </Stack>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" sx={{ mb: 1 }}>
          {message}
        </Alert>
      )}

      {isLoading || isImporting || isUpdatingSelection ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress aria-label="Loading library" />
        </Box>
      ) : rows.length === 0 ? (
        <Typography sx={{ p: 2 }}>
          No library rows yet. Import a CSV file to add content.
        </Typography>
      ) : filteredRows.length === 0 ? (
        <Typography sx={{ p: 2 }}>
          No library rows found for this group.
        </Typography>
      ) : (
        <List aria-label="Content library" disablePadding>
          <ListItem sx={{ px: 2, py: 0.5 }}>
            <Checkbox
              checked={allFilteredSelected}
              indeterminate={someFilteredSelected}
              onChange={(event) =>
                toggleFilteredSelection(event.target.checked)
              }
              slotProps={{
                input: { "aria-label": "Select all filtered rows" },
              }}
            />
            <Typography variant="body2" color="text.secondary">
              Select all filtered rows
            </Typography>
          </ListItem>
          {filteredRows.map((row) => (
            <React.Fragment key={`${row.content.group}:${row.content.text}`}>
              <ListItem alignItems="flex-start" sx={{ px: 2, py: 1.5, gap: 2 }}>
                <Checkbox
                  checked={selectedRowKeys.has(getRowKey(row))}
                  onChange={(event) =>
                    toggleRowSelection(row, event.target.checked)
                  }
                  slotProps={{
                    input: {
                      "aria-label": `Select ${row.content.text}`,
                    },
                  }}
                  sx={{ alignSelf: "center" }}
                />
                <ListItemText
                  sx={{ minWidth: 0 }}
                  primary={row.content.text}
                  secondary={formatRowDetails(row)}
                  slotProps={{
                    primary: {
                      component: "div",
                      sx: { fontWeight: 500, overflowWrap: "anywhere" },
                    },
                    secondary: {
                      component: "div",
                      sx: { mt: 0.5, overflowWrap: "anywhere" },
                    },
                  }}
                />
                <Chip
                  size="small"
                  color={row.isBuiltIn ? "primary" : "default"}
                  label={row.isBuiltIn ? "Built-in" : "Imported"}
                  aria-label={
                    row.isBuiltIn
                      ? "Built-in collection"
                      : "Imported collection"
                  }
                  sx={{ flexShrink: 0 }}
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      )}
    </>
  );
}
