import {
  AutoStoriesRounded,
  DeleteOutlineRounded,
  FileDownloadRounded,
  FileUploadRounded,
  RestartAltRounded,
  ScheduleRounded,
} from "@mui/icons-material";
import { Autocomplete, TextField } from "@mui/material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { getStageBadgeColor, StatusBadge } from "../../components/StatusBadge";
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

function formatExtraDetails(row: LibraryRow) {
  return Object.entries(row.content)
    .filter(([field]) => !["group", "text", "answers"].includes(field))
    .map(([field, value]) => `${field}: ${formatValue(value)}`)
    .filter((detail) => !detail.endsWith(": "));
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
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
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
      const rowsToExport =
        selectedRows.length > 0 ? selectedRows : filteredRows;
      if (!rowsToExport.length) {
        setError("There is no library data to export.");
        return;
      }
      const exportScope = selectedRows.length > 0 ? "selected" : selectedGroup;
      downloadCsv(
        createCsvFromLibrary(rowsToExport),
        `library-${exportScope}-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (exportError) {
      console.error("Failed to export library rows:", exportError);
      setError("Unable to export library rows. See console for details.");
    }
  };

  const resetSelectedProgress = async () => {
    if (selectedRows.length === 0 || isUpdatingSelection) return;
    setIsResetDialogOpen(false);
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
    setIsDeleteDialogOpen(false);
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
        <Autocomplete
          size="small"
          sx={{ minWidth: 220, width: { xs: "100%", sm: 220 } }}
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
          sx={{
            width: { xs: "100%", sm: "auto" },
            flexWrap: "wrap",
            justifyContent: "flex-end",
            ml: { sm: "auto" },
          }}
        >
          {selectedRows.length > 0 && (
            <>
              <IconButton
                aria-label="Reset selected progress"
                size="small"
                sx={{
                  width: 40,
                  height: 40,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
                disabled={isImporting || isUpdatingSelection}
                onClick={() => setIsResetDialogOpen(true)}
              >
                <RestartAltRounded fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="Remove selected cards"
                size="small"
                color="error"
                sx={{
                  width: 40,
                  height: 40,
                  border: 1,
                  borderColor: "error.main",
                  borderRadius: 1,
                }}
                disabled={isImporting || isUpdatingSelection}
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <DeleteOutlineRounded fontSize="small" />
              </IconButton>
            </>
          )}
          {selectedRows.length === 0 && (
            <IconButton
              aria-label="Import CSV"
              size="small"
              sx={{
                width: 40,
                height: 40,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
              disabled={isImporting || isUpdatingSelection}
              onClick={() => setIsImportDialogOpen(true)}
            >
              <FileUploadRounded fontSize="small" />
            </IconButton>
          )}
          <input
            ref={importInputRef}
            type="file"
            hidden
            accept=".csv,text/csv"
            onChange={(event) => void handleImport(event)}
          />
          {selectedRows.length > 0 && (
            <IconButton
              aria-label="Export selected cards"
              size="small"
              sx={{
                width: 40,
                height: 40,
                border: 1,
                borderColor: "divider",
                borderRadius: 1,
              }}
              disabled={isImporting || isUpdatingSelection}
              onClick={exportLibrary}
            >
              <FileDownloadRounded fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Stack>

      <Dialog
        open={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        aria-labelledby="reset-progress-title"
        aria-describedby="reset-progress-description"
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle id="reset-progress-title" sx={{ pt: 3, pb: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                borderRadius: 1,
                bgcolor: "action.selected",
                color: "primary.main",
                flexShrink: 0,
              }}
            >
              <RestartAltRounded />
            </Box>
            <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
              Reset progress?
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography id="reset-progress-description" color="text.secondary">
            Reset progress for {selectedRows.length} selected card
            {selectedRows.length === 1 ? "" : "s"}.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button autoFocus onClick={() => setIsResetDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void resetSelectedProgress()}
          >
            Reset progress
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        aria-labelledby="delete-cards-title"
        aria-describedby={
          removableRows.length > 0 ? "delete-cards-description" : undefined
        }
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle id="delete-cards-title" sx={{ pt: 3, pb: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                borderRadius: 1,
                bgcolor: "error.main",
                color: "error.contrastText",
                flexShrink: 0,
              }}
            >
              <DeleteOutlineRounded />
            </Box>
            <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
              {removableRows.length === 0
                ? "Built-in cards cannot be removed"
                : "Delete selected cards?"}
            </Typography>
          </Stack>
        </DialogTitle>
        {removableRows.length > 0 && (
          <DialogContent>
            <Typography id="delete-cards-description" color="text.secondary">
              This will permanently delete {removableRows.length} imported card
              {removableRows.length === 1 ? "" : "s"} and their progress.
            </Typography>
            {selectedRows.length > removableRows.length && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1.5 }}
              >
                Built-in cards in your selection will be kept.
              </Typography>
            )}
          </DialogContent>
        )}
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button autoFocus onClick={() => setIsDeleteDialogOpen(false)}>
            {removableRows.length === 0 ? "Close" : "Cancel"}
          </Button>
          {removableRows.length > 0 && (
            <Button
              variant="contained"
              color="error"
              onClick={() => void removeSelectedRows()}
            >
              Delete cards
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="import-cards-title"
        slotProps={{ paper: { sx: { borderRadius: 2 } } }}
      >
        <DialogTitle id="import-cards-title" sx={{ pt: 3, pb: 1 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                display: "grid",
                placeItems: "center",
                borderRadius: 1,
                bgcolor: "action.selected",
                color: "primary.main",
                flexShrink: 0,
              }}
            >
              <FileUploadRounded />
            </Box>
            <Typography component="span" variant="h6" sx={{ fontWeight: 700 }}>
              Import cards
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Box
              sx={{
                bgcolor: "action.hover",
                borderRadius: 1,
                p: 1.5,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                Example
              </Typography>
              <Typography
                component="pre"
                variant="body2"
                sx={{
                  fontFamily: "monospace",
                  mb: 0,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {
                  "group,text,answers\nmy-cards,hello,hi\nmy-cards,goodbye,bye|see you"
                }
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Built-in collections cannot be imported or replaced.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setIsImportDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<FileUploadRounded />}
            onClick={() => {
              setIsImportDialogOpen(false);
              importInputRef.current?.click();
            }}
          >
            Choose CSV
          </Button>
        </DialogActions>
      </Dialog>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert
          severity="success"
          onClose={() => setMessage(null)}
          sx={{ mb: 1 }}
        >
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
          <ListItem sx={{ justifyContent: "space-between", px: 2, py: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {selectedFilteredCount} / {filteredRows.length} selected
            </Typography>
            <Button
              size="small"
              onClick={() => toggleFilteredSelection(!allFilteredSelected)}
            >
              {allFilteredSelected ? "Deselect all" : "Select all"}
            </Button>
          </ListItem>
          {filteredRows.map((row) => {
            const answers = formatValue(row.content.answers);
            const extraDetails = formatExtraDetails(row);

            return (
              <React.Fragment key={`${row.content.group}:${row.content.text}`}>
                <ListItemButton
                  component="button"
                  type="button"
                  role="checkbox"
                  aria-checked={selectedRowKeys.has(getRowKey(row))}
                  aria-label={`Select ${row.content.text}`}
                  selected={selectedRowKeys.has(getRowKey(row))}
                  onClick={() =>
                    toggleRowSelection(
                      row,
                      !selectedRowKeys.has(getRowKey(row)),
                    )
                  }
                  sx={(theme) => ({
                    alignItems: "flex-start",
                    px: 2,
                    py: 1.5,
                    gap: 1.5,
                    width: "100%",
                    borderLeft: "3px solid",
                    borderColor: selectedRowKeys.has(getRowKey(row))
                      ? "primary.main"
                      : "transparent",
                    "&.Mui-selected": { bgcolor: "action.selected" },
                    "&.Mui-selected:hover": {
                      bgcolor: theme.palette.action.hover,
                    },
                  })}
                >
                  <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      component="div"
                      variant="subtitle1"
                      sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
                    >
                      {row.content.text}
                    </Typography>
                    {answers && (
                      <Typography
                        component="div"
                        variant="body2"
                        color="text.secondary"
                        sx={{ overflowWrap: "anywhere" }}
                      >
                        {answers}
                      </Typography>
                    )}
                    <Stack
                      direction="row"
                      spacing={0.75}
                      useFlexGap
                      sx={{ flexWrap: "wrap", pt: 0.25 }}
                    >
                      <Chip
                        size="small"
                        variant="outlined"
                        label={row.content.group}
                        aria-label={`Group: ${row.content.group}`}
                      />
                      <StatusBadge
                        color={getStageBadgeColor(row.progress.stage)}
                        label={getStageName(row.progress.stage)}
                        ariaLabel={`Progress: ${getStageName(row.progress.stage)}`}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        icon={<ScheduleRounded />}
                        label={formatReviewDate(row.progress.nextReview)}
                        aria-label={`Next review: ${formatReviewDate(row.progress.nextReview)}`}
                      />
                    </Stack>
                    {extraDetails.length > 0 && (
                      <Typography
                        component="div"
                        variant="caption"
                        color="text.secondary"
                        sx={{ overflowWrap: "anywhere" }}
                      >
                        {extraDetails.join(" · ")}
                      </Typography>
                    )}
                  </Stack>
                  <Chip
                    size="small"
                    color={row.isBuiltIn ? "primary" : "default"}
                    variant={row.isBuiltIn ? "filled" : "outlined"}
                    icon={
                      row.isBuiltIn ? (
                        <AutoStoriesRounded />
                      ) : (
                        <FileUploadRounded />
                      )
                    }
                    label={row.isBuiltIn ? "Built-in" : "Imported"}
                    aria-label={
                      row.isBuiltIn
                        ? "Built-in collection"
                        : "Imported collection"
                    }
                    sx={{ flexShrink: 0, mt: 0.25 }}
                  />
                </ListItemButton>
                <Divider component="li" />
              </React.Fragment>
            );
          })}
        </List>
      )}
    </>
  );
}
