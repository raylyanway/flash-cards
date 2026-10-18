import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { getContentRows } from "../../db";
import type { ContentRecord } from "../../types";

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function LibraryList() {
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

  return (
    <List aria-label="Content library" disablePadding>
      {rows.map((row) => {
        const details = Object.entries(row)
          .filter(([field]) => field !== "text")
          .map(([field, value]) => `${field}: ${formatValue(value)}`)
          .filter((detail) => !detail.endsWith(": "))
          .join(" · ");

        return (
          <React.Fragment key={`${row.setName}:${row.text}`}>
            <ListItem alignItems="flex-start" sx={{ px: 2, py: 1.5 }}>
              <ListItemText
                primary={row.text}
                secondary={details || undefined}
                slotProps={{
                  primary: { component: "div", sx: { fontWeight: 500 } },
                  secondary: { component: "div", sx: { mt: 0.5 } },
                }}
              />
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        );
      })}
    </List>
  );
}
