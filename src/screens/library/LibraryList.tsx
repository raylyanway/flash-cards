import {
  AutoStoriesRounded,
  CloseRounded,
  DeleteOutlineRounded,
  FileDownloadRounded,
  FileUploadRounded,
  FolderOutlined,
  RestartAltRounded,
  ScheduleRounded,
  SearchRounded,
} from "@mui/icons-material";
import { Autocomplete, TextField } from "@mui/material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListSubheader from "@mui/material/ListSubheader";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { getStageBadgeColor, StatusBadge } from "../../components/StatusBadge";
import {
  DEFAULT_CONTENT,
  deleteLibraryRows,
  getLibraryRows,
  importLibraryRows,
} from "../../db";
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
  const [search, setSearch] = React.useState("");
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<Set<string>>(
    new Set(),
  );

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      if (selectedGroup !== "all" && row.content.group !== selectedGroup) {
        return false;
      }
      if (!query) return true;
      const answers = Array.isArray(row.content.answers)
        ? row.content.answers
        : [row.content.answers ?? ""];
      return [row.content.text, ...answers].some((value) =>
        value.toLocaleLowerCase().includes(query),
      );
    });
  }, [rows, search, selectedGroup]);
  const groupFilterOptions = React.useMemo(() => {
    const builtInKeys = new Set(DEFAULT_CONTENT.map((option) => option.key));
    return [
      { key: "all", label: "All groups" },
      ...contentOptions.filter((option) => builtInKeys.has(option.key)),
      ...contentOptions.filter((option) => !builtInKeys.has(option.key)),
    ];
  }, [contentOptions]);
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
          pb: 2,
        }}
      >
        <Autocomplete
          size="small"
          sx={{ minWidth: 0, width: { xs: "100%", sm: 220 } }}
          options={groupFilterOptions}
          value={selectedGroupOption}
          getOptionLabel={(option) => option.label}
          groupBy={(option) =>
            option.key === "all"
              ? ""
              : DEFAULT_CONTENT.some((content) => content.key === option.key)
                ? "Built-in"
                : "Imported"
          }
          renderGroup={(group) =>
            group.group ? (
              <li key={group.key}>
                <ListSubheader component="div">{group.group}</ListSubheader>
                <Box component="ul" sx={{ p: 0 }}>
                  {group.children}
                </Box>
              </li>
            ) : (
              <React.Fragment key={group.key}>{group.children}</React.Fragment>
            )
          }
          isOptionEqualToValue={(option, value) => option.key === value.key}
          onChange={(_, option) => {
            setSelectedGroup(option?.key ?? "all");
            setSelectedRowKeys(new Set());
          }}
          renderInput={(params) => (
            <TextField {...params} label="Filter by group" />
          )}
        />
        <TextField
          size="small"
          label="Search cards"
          placeholder="Text or answer"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSelectedRowKeys(new Set());
          }}
          sx={{
            width: { xs: "100%", sm: "auto" },
            flex: { sm: 1 },
            minWidth: 0,
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Clear search"
                    size="small"
                    onClick={() => {
                      setSearch("");
                      setSelectedRowKeys(new Set());
                    }}
                  >
                    <CloseRounded fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
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
                sx={{
                  width: 40,
                  height: 40,
                  border: 1,
                  borderColor: "divider",
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
          {search.trim()
            ? "No cards match your search."
            : "No library rows found for this group."}
        </Typography>
      ) : (
        <List aria-label="Content library" disablePadding>
          <ListItem
            sx={{
              justifyContent: "space-between",
              px: { xs: 0.5, sm: 1 },
              py: 1,
              borderTop: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {filteredRows.length} card{filteredRows.length === 1 ? "" : "s"}
              {selectedFilteredCount > 0 &&
                ` · ${selectedFilteredCount} selected`}
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
            const isSelected = selectedRowKeys.has(getRowKey(row));

            return (
              <React.Fragment key={`${row.content.group}:${row.content.text}`}>
                <ListItemButton
                  component="button"
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Select ${row.content.text}`}
                  selected={isSelected}
                  onClick={() => toggleRowSelection(row, !isSelected)}
                  sx={(theme) => ({
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "minmax(0, 1fr)",
                      sm: "minmax(0, 1fr) minmax(0, 280px)",
                    },
                    alignItems: "center",
                    px: { xs: 1, sm: 1.5 },
                    py: 1,
                    columnGap: 2,
                    rowGap: 0.5,
                    width: "100%",
                    borderLeft: "3px solid",
                    borderColor: isSelected ? "primary.main" : "transparent",
                    "&.Mui-selected": { bgcolor: "action.selected" },
                    "&.Mui-selected:hover": {
                      bgcolor: theme.palette.action.hover,
                    },
                  })}
                >
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Typography
                      component="div"
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        lineHeight: 1.3,
                        overflowWrap: "anywhere",
                      }}
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
                  <Stack
                    spacing={0.5}
                    sx={{
                      minWidth: 0,
                      color: "text.secondary",
                      borderLeft: { sm: 1 },
                      borderColor: "divider",
                      pl: { sm: 2 },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.5}
                        aria-label={`Group: ${row.content.group}`}
                        sx={{ alignItems: "center", minWidth: 0 }}
                      >
                        <FolderOutlined sx={{ fontSize: 15, flexShrink: 0 }} />
                        <Typography
                          variant="caption"
                          sx={{ overflowWrap: "anywhere" }}
                        >
                          {row.content.group}
                        </Typography>
                      </Stack>
                      <StatusBadge
                        color={getStageBadgeColor(row.progress.stage)}
                        label={getStageName(row.progress.stage)}
                        ariaLabel={`Progress: ${getStageName(row.progress.stage)}`}
                      />
                    </Stack>
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={0.5}
                        aria-label={`Next review: ${formatReviewDate(row.progress.nextReview)}`}
                        sx={{ alignItems: "center", minWidth: 0 }}
                      >
                        <ScheduleRounded sx={{ fontSize: 15, flexShrink: 0 }} />
                        <Typography variant="caption">
                          {formatReviewDate(row.progress.nextReview)}
                        </Typography>
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        aria-label={
                          row.isBuiltIn
                            ? "Built-in collection"
                            : "Imported collection"
                        }
                        sx={{ alignItems: "center", flexShrink: 0 }}
                      >
                        {row.isBuiltIn ? (
                          <AutoStoriesRounded sx={{ fontSize: 15 }} />
                        ) : (
                          <FileUploadRounded sx={{ fontSize: 15 }} />
                        )}
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {row.isBuiltIn ? "Built-in" : "Imported"}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
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
