import { FileDownloadRounded, FileUploadRounded } from "@mui/icons-material";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { getLibraryRows, importLibraryRows } from "../../db";
import { useAppStore } from "../../store/useAppStore";
import type { LibraryRow } from "../../types";
import { getStageName } from "../../utils/cardProgress";
import {
  createCsvFromLibrary,
  downloadCsv,
  parseLibraryCsv,
} from "../../utils/csv";

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatRowDetails(row: LibraryRow) {
  const contentDetails = Object.entries(row.content)
    .filter(([field]) => field !== "text")
    .map(([field, value]) => `${field}: ${formatValue(value)}`)
    .filter((detail) => !detail.endsWith(": "));
  const progressDetails = [
    `stage: ${row.progress.stage} (${getStageName(row.progress.stage)})`,
    `nextReview: ${row.progress.nextReview}`,
    `correctCount: ${row.progress.correctCount}`,
  ];
  return [...contentDetails, ...progressDetails].join(" · ");
}

export function LibraryList() {
  const progress = useAppStore((state) => state.progress);
  const contentOptions = useAppStore((state) => state.contentOptions);
  const currentGroup = useAppStore((state) => state.currentGroup);
  const setCurrentGroup = useAppStore((state) => state.setCurrentGroup);
  const loadGroupData = useAppStore((state) => state.loadGroupData);
  const setProgress = useAppStore((state) => state.setProgress);
  const setProgressSearch = useAppStore((state) => state.setProgressSearch);
  const setSetupBackup = useAppStore((state) => state.setSetupBackup);
  const refreshContentOptions = useAppStore(
    (state) => state.refreshContentOptions,
  );
  const navigate = useNavigate();

  const importInputRef = React.useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = React.useState<LibraryRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);

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

  const handleGroupChange = async (group: string) => {
    setError(null);
    setCurrentGroup(group);
    try {
      await loadGroupData(group);
    } catch (loadError) {
      console.error("Failed to load library collection progress:", loadError);
      setError(
        loadError instanceof Error
          ? `Unable to load collection progress: ${loadError.message}`
          : "Unable to load collection progress.",
      );
    }
  };

  const openProgressSetup = () => {
    setSetupBackup(progress[currentGroup] ?? null);
    setProgressSearch("");
    navigate("/progress-setup");
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
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="library-progress-group">
              Progress collection
            </InputLabel>
            <Select
              labelId="library-progress-group"
              label="Progress collection"
              value={currentGroup}
              onChange={(event) => {
                void handleGroupChange(event.target.value);
              }}
            >
              {contentOptions.map((option) => (
                <MenuItem key={option.key} value={option.key}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={openProgressSetup}>
            Set up progress
          </Button>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FileUploadRounded />}
            disabled={isImporting}
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

      {isLoading || isImporting ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress aria-label="Loading library" />
        </Box>
      ) : rows.length === 0 ? (
        <Typography sx={{ p: 2 }}>
          No library rows yet. Import a CSV file to add content.
        </Typography>
      ) : (
        <List aria-label="Content library" disablePadding>
          {rows.map((row) => (
            <React.Fragment key={`${row.content.group}:${row.content.text}`}>
              <ListItem alignItems="flex-start" sx={{ px: 2, py: 1.5, gap: 2 }}>
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
