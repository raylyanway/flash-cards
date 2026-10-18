import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import FileDownloadRounded from "@mui/icons-material/FileDownloadRounded";
import * as React from "react";
import { getContentRows } from "../../db";
import { useAppStore } from "../../store/useAppStore";
import type { ContentRecord } from "../../types";
import { getStageName } from "../../utils/cardProgress";
import { createCsvFromProgress, downloadCsv } from "../../utils/csv";

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function LibraryList() {
  const progress = useAppStore((state) => state.progress);
  const [exportError, setExportError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ContentRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let active = true;

    getContentRows()
      .then((contentRows) => {
        if (active) setRows(contentRows);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError
              : new Error(String(loadError)),
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return <Alert severity="error">{error.message}</Alert>;
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress aria-label="Loading content" />
      </Box>
    );
  }

  if (rows.length === 0) {
    return (
      <Typography sx={{ p: 2 }}>No content has been saved yet.</Typography>
    );
  }

  const exportProgress = () => {
    try {
      setExportError(null);
      downloadCsv(
        createCsvFromProgress(progress, rows),
        `library-progress-${new Date().toISOString().split("T")[0]}.csv`,
      );
    } catch (error) {
      console.error("Failed to export library progress:", error);
      setExportError("Unable to export progress. See console for details.");
    }
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          p: 1,
        }}
      >
        <Button
          variant="outlined"
          startIcon={<FileDownloadRounded />}
          onClick={exportProgress}
        >
          Export progress CSV
        </Button>
      </Box>
      {exportError && <Alert severity="error">{exportError}</Alert>}
      <List aria-label="Content library" disablePadding>
        {rows.map((row) => {
          const stage = progress[row.group]?.[row.text]?.stage ?? 0;
          const details = Object.entries(row)
            .filter(([field]) => field !== "text")
            .map(([field, value]) => `${field}: ${formatValue(value)}`)
            .filter((detail) => !detail.endsWith(": "))
            .join(" · ");

          return (
            <React.Fragment key={`${row.group}:${row.text}`}>
              <ListItem alignItems="flex-start" sx={{ px: 2, py: 1.5, gap: 2 }}>
                <ListItemText
                  sx={{ minWidth: 0 }}
                  primary={row.text}
                  secondary={details || undefined}
                  slotProps={{
                    primary: { component: "div", sx: { fontWeight: 500 } },
                    secondary: { component: "div", sx: { mt: 0.5 } },
                  }}
                />
                <Typography
                  variant="body2"
                  aria-label={`Progress status: ${getStageName(stage)}`}
                  sx={{
                    flexShrink: 0,
                    fontWeight: 600,
                    color:
                      stage === 3
                        ? "success.main"
                        : stage === 0
                          ? "text.secondary"
                          : "warning.main",
                  }}
                >
                  {getStageName(stage)}
                </Typography>
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          );
        })}
      </List>
    </>
  );
}
