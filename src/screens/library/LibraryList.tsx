import {
  ArrowBackRounded,
  ChevronRightRounded,
  CloseRounded,
  DeleteOutlineRounded,
  FileDownloadRounded,
  FileUploadRounded,
  FolderOutlined,
  RestartAltRounded,
  SearchRounded,
  SortRounded,
} from "@mui/icons-material";
import { TextField, useMediaQuery } from "@mui/material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
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
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { getStageBadgeColor, StatusBadge } from "../../components/StatusBadge";
import {
  DEFAULT_CONTENT,
  deleteLibraryRows,
  getGroupOverviewProgress,
  getLibraryRows,
  importLibraryRows,
  initializeGroupContent,
} from "../../db";
import { useAppStore } from "../../store/useAppStore";
import type { LibraryRow, ProgressMap } from "../../types";
import { getStageName } from "../../utils/cardProgress";
import {
  createCsvFromLibrary,
  downloadCsv,
  parseLibraryCsv,
} from "../../utils/csv";

type SortOrder = "default" | "text-asc" | "text-desc" | "stage";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "text-asc", label: "Text A–Z" },
  { value: "text-desc", label: "Text Z–A" },
  { value: "stage", label: "By stage" },
];

function LibraryAlert({
  message,
  severity,
  onClose,
}: {
  message: string | null;
  severity: "error" | "success";
  onClose: () => void;
}) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [lastMessage, setLastMessage] = React.useState(message);

  React.useEffect(() => {
    if (message) setLastMessage(message);
  }, [message]);

  return (
    <Collapse
      in={Boolean(message)}
      timeout={reduceMotion ? 0 : 300}
      unmountOnExit
    >
      <Alert
        severity={severity}
        onClose={onClose}
        sx={{
          mb: 1,
          opacity: message ? 1 : 0,
          transition: reduceMotion ? "none" : "opacity 300ms ease",
        }}
      >
        {(message ?? lastMessage ?? "").replace(/\.$/, "")}
      </Alert>
    </Collapse>
  );
}

function getRowKey(row: LibraryRow) {
  return JSON.stringify([row.content.group, row.content.text]);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
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
  const [builtInCounts, setBuiltInCounts] = React.useState<
    Record<string, number>
  >({});
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isUpdatingSelection, setIsUpdatingSelection] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("default");
  const sortIndex = SORT_OPTIONS.findIndex(
    (option) => option.value === sortOrder,
  );
  const currentSort = SORT_OPTIONS[sortIndex];
  const nextSort = SORT_OPTIONS[(sortIndex + 1) % SORT_OPTIONS.length];
  const [selectedRowKeys, setSelectedRowKeys] = React.useState<Set<string>>(
    new Set(),
  );

  const filteredRows = React.useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matches = rows.filter((row) => {
      if (row.content.group !== selectedGroup) {
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
    if (sortOrder === "text-asc" || sortOrder === "text-desc") {
      matches.sort((first, second) => {
        const comparison = first.content.text.localeCompare(
          second.content.text,
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          },
        );
        return sortOrder === "text-asc" ? comparison : -comparison;
      });
    } else if (sortOrder === "stage") {
      matches.sort(
        (first, second) => first.progress.stage - second.progress.stage,
      );
    }
    return matches;
  }, [rows, search, selectedGroup, sortOrder]);
  const selectedGroupOption = contentOptions.find(
    (option) => option.key === selectedGroup,
  );
  const isBuiltInGroup = DEFAULT_CONTENT.some(
    (option) => option.key === selectedGroup,
  );
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

  const openGroup = async (group: string) => {
    setSelectedGroup(group);
    setSearch("");
    setSelectedRowKeys(new Set());
    setError(null);
    setMessage(null);
    setIsLoading(true);
    try {
      if (DEFAULT_CONTENT.some((content) => content.key === group)) {
        await initializeGroupContent(group);
      }
      setRows(await getLibraryRows(progress));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load group.",
      );
    } finally {
      setIsLoading(false);
    }
  };

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
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 5_000);
    return () => window.clearTimeout(timer);
  }, [error]);

  React.useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 5_000);
    return () => window.clearTimeout(timer);
  }, [message]);

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

  React.useEffect(() => {
    let active = true;
    for (const option of DEFAULT_CONTENT) {
      void getGroupOverviewProgress(option.key)
        .then((entries) => {
          if (active) {
            setBuiltInCounts((current) => ({
              ...current,
              [option.key]: entries.length,
            }));
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  const exportLibrary = () => {
    try {
      setError(null);
      const rowsToExport =
        selectedRows.length > 0 ? selectedRows : filteredRows;
      if (!rowsToExport.length) {
        setError("No cards to export.");
        return;
      }
      const exportScope = selectedRows.length > 0 ? "selected" : selectedGroup;
      downloadCsv(
        createCsvFromLibrary(rowsToExport),
        `library-${exportScope}-${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (exportError) {
      console.error("Failed to export library rows:", exportError);
      setError("Unable to export cards.");
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
          review: 0,
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
      const options = await refreshContentOptions(currentGroup);
      const nextCurrentGroup = options.some(
        (option) => option.key === currentGroup,
      )
        ? currentGroup
        : options[0]?.key;
      if (nextProgress[currentGroup] && nextCurrentGroup) {
        await loadGroupData(nextCurrentGroup);
      }
      setRows(
        await getLibraryRows({
          ...progress,
          ...nextProgress,
        }),
      );
      if (
        selectedGroup &&
        !options.some((option) => option.key === selectedGroup)
      ) {
        setSelectedGroup(null);
        setSearch("");
      }
      setSelectedRowKeys(new Set());
      const keptBuiltInCount = selectedRows.length - removableRows.length;
      setMessage(
        `Deleted ${removableRows.length} imported card${removableRows.length === 1 ? "" : "s"} and their progress.${keptBuiltInCount > 0 ? ` ${keptBuiltInCount} built-in card${keptBuiltInCount === 1 ? " was" : "s were"} kept.` : ""}`,
      );
    } catch (deleteError) {
      console.error("Failed to remove selected library rows:", deleteError);
      setError(
        deleteError instanceof Error
          ? `Unable to remove selected cards: ${deleteError.message}`
          : "Unable to remove selected cards.",
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
      if (isBuiltInGroup) {
        throw new Error("Built-in collections cannot be imported or replaced.");
      }
      const importedRows = parseLibraryCsv(
        await file.text(),
        selectedGroup ?? undefined,
        DEFAULT_CONTENT.map((option) => option.key),
      );
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
      setMessage(
        `${importedRows.length} card${importedRows.length === 1 ? "" : "s"} imported.`,
      );
    } catch (importError) {
      console.error("Failed to import library:", importError);
      setError(
        importError instanceof Error
          ? `Unable to import cards: ${importError.message}`
          : "Unable to import cards.",
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
        useFlexGap
        sx={{
          alignItems: { sm: "center" },
          flexWrap: { sm: "wrap", md: "nowrap" },
          justifyContent: "space-between",
          pb: 2,
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", minWidth: 0 }}
        >
          {selectedGroup !== null && (
            <IconButton
              aria-label="Back to groups"
              disabled={isLoading || isImporting || isUpdatingSelection}
              onClick={() => {
                setSelectedGroup(null);
                setSearch("");
                setSelectedRowKeys(new Set());
                setError(null);
                setMessage(null);
              }}
            >
              <ArrowBackRounded />
            </IconButton>
          )}
          <Typography
            component="h2"
            variant="h6"
            sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
          >
            {selectedGroupOption?.label ?? "Groups"}
          </Typography>
        </Stack>
        {selectedGroup !== null && (
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
              flex: { sm: "1 1 220px" },
              minWidth: { xs: 0, sm: 200 },
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
        )}
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
              {!isBuiltInGroup && (
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
              )}
            </>
          )}
          {selectedRows.length === 0 && !isBuiltInGroup && (
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
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              m: { xs: 2, sm: 4 },
              width: { xs: "calc(100% - 32px)", sm: "calc(100% - 64px)" },
            },
          },
        }}
      >
        <DialogTitle
          id="import-cards-title"
          sx={{ px: { xs: 2, sm: 3 }, pt: 3, pb: 1 }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box
              sx={{
                width: { xs: 32, sm: 40 },
                height: { xs: 32, sm: 40 },
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
            <Typography
              component="span"
              variant="h6"
              sx={{ fontWeight: 700, minWidth: 0, overflowWrap: "anywhere" }}
            >
              Import cards
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
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
                {selectedGroup
                  ? "text,answers\nhello,hi\ngoodbye,bye|see you"
                  : "group,text,answers\nmy-cards,hello,hi\nmore-cards,goodbye,bye|see you"}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ overflowWrap: "anywhere" }}
            >
              {selectedGroup
                ? `CSV requires 'text' and 'answers' columns. The 'group' column is optional; if present, only '${selectedGroup}' rows are imported and other groups are ignored.`
                : "CSV requires group, text and answers. New groups are created, existing cards are updated, and built-in groups are skipped."}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{ px: { xs: 2, sm: 3 }, pb: 3, gap: 1, flexWrap: "wrap" }}
        >
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

      <LibraryAlert
        message={error}
        severity="error"
        onClose={() => setError(null)}
      />
      <LibraryAlert
        message={message}
        severity="success"
        onClose={() => setMessage(null)}
      />

      {isLoading || isImporting || isUpdatingSelection ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress aria-label="Loading library" />
        </Box>
      ) : selectedGroup === null ? (
        <List aria-label="Library groups" disablePadding>
          {[true, false].map((builtIn) => {
            const groups = contentOptions.filter(
              (option) =>
                DEFAULT_CONTENT.some(
                  (content) => content.key === option.key,
                ) === builtIn,
            );
            if (groups.length === 0) return null;
            return (
              <React.Fragment key={builtIn ? "built-in" : "imported"}>
                <ListItem sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    {builtIn ? "Built-in" : "Imported"}
                  </Typography>
                </ListItem>
                {groups.map((option) => {
                  const storedCount = rows.filter(
                    (row) => row.content.group === option.key,
                  ).length;
                  const count = builtIn
                    ? storedCount || builtInCounts[option.key]
                    : storedCount;
                  return (
                    <React.Fragment key={option.key}>
                      <ListItemButton
                        component="button"
                        type="button"
                        onClick={() => void openGroup(option.key)}
                        sx={{
                          width: "100%",
                          minHeight: 48,
                          px: 1.5,
                          py: 1,
                          gap: 1.5,
                        }}
                      >
                        <FolderOutlined color="primary" fontSize="small" />
                        <Box
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Typography
                            sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
                          >
                            {option.label}
                          </Typography>
                          {count !== undefined && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ whiteSpace: "nowrap" }}
                            >
                              {count} card{count === 1 ? "" : "s"}
                            </Typography>
                          )}
                        </Box>
                        <ChevronRightRounded color="action" />
                      </ListItemButton>
                      <Divider component="li" />
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </List>
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
              gap: 1,
              flexWrap: "wrap",
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
            <Stack
              direction="row"
              spacing={0.5}
              useFlexGap
              sx={{
                ml: "auto",
                maxWidth: "100%",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <Button
                size="small"
                startIcon={<SortRounded />}
                aria-label={`Sort: ${currentSort.label}. Next: ${nextSort.label}`}
                onClick={() => setSortOrder(nextSort.value)}
                sx={{ whiteSpace: "nowrap" }}
              >
                Sort: {currentSort.label}
              </Button>
              <Button
                size="small"
                onClick={() => toggleFilteredSelection(!allFilteredSelected)}
                sx={{ whiteSpace: "nowrap" }}
              >
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </Button>
            </Stack>
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
                    gridTemplateColumns: "minmax(0, 1fr) auto",
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
                  <StatusBadge
                    color={getStageBadgeColor(row.progress.stage)}
                    label={getStageName(row.progress.stage)}
                    ariaLabel={`Progress: ${getStageName(row.progress.stage)}`}
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
