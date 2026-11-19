import { HomeRounded, PlayArrowRounded } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { getGroupOverviewProgress } from "../db";
import { useAppStore } from "../store/useAppStore";
import type { ProgressEntry } from "../types";
import { MASTERED_STAGE } from "../utils/cardProgress";

type GroupOverview =
  | { progress: ProgressEntry[]; error: false }
  | { error: true };

export function HomeScreen() {
  const currentGroup = useAppStore((state) => state.currentGroup);
  const contentOptions = useAppStore((state) => state.contentOptions);
  const loadGroupData = useAppStore((state) => state.loadGroupData);
  const now = useAppStore((state) => state.now);
  const navigate = useNavigate();
  const [overviews, setOverviews] = useState<Record<string, GroupOverview>>({});
  const [loadingGroup, setLoadingGroup] = useState<string | null>(null);
  const [groupLoadError, setGroupLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setOverviews({});
    for (const option of contentOptions) {
      void getGroupOverviewProgress(option.key)
        .then((progress) => {
          if (active) {
            setOverviews((current) => ({
              ...current,
              [option.key]: { progress, error: false },
            }));
          }
        })
        .catch(() => {
          if (active) {
            setOverviews((current) => ({
              ...current,
              [option.key]: { error: true },
            }));
          }
        });
    }
    return () => {
      active = false;
    };
  }, [contentOptions]);

  const startReview = async (group: string) => {
    if (loadingGroup) return;
    setLoadingGroup(group);
    setGroupLoadError(null);
    try {
      if (group !== currentGroup) await loadGroupData(group);
      navigate("/learn");
    } catch (error) {
      setGroupLoadError(
        error instanceof Error ? error.message : "Unable to load this group.",
      );
    } finally {
      setLoadingGroup(null);
    }
  };

  return (
    <>
      <PageHeader
        icon={<HomeRounded />}
        title="Study overview"
        description="Choose a group and pick up where you left off."
      />
      {groupLoadError && (
        <Alert
          severity="error"
          onClose={() => setGroupLoadError(null)}
          sx={{ mb: 2 }}
        >
          {groupLoadError}
        </Alert>
      )}
      <Box component="section" aria-labelledby="groups-title">
        <Stack
          direction="row"
          sx={{
            alignItems: "baseline",
            justifyContent: "space-between",
            pb: 1.5,
            gap: 2,
          }}
        >
          <Typography
            id="groups-title"
            component="h2"
            variant="h6"
            sx={{ fontWeight: 700 }}
          >
            Your groups
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {contentOptions.length} group
            {contentOptions.length === 1 ? "" : "s"}
          </Typography>
        </Stack>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {contentOptions.map((option) => {
            const overview = overviews[option.key];
            const entries =
              overview && "progress" in overview ? overview.progress : [];
            const mastered = entries.filter(
              (entry) => entry.stage >= MASTERED_STAGE,
            ).length;
            const ready = entries.filter(
              (entry) =>
                entry.stage < MASTERED_STAGE && entry.nextReview <= now,
            ).length;
            const percent = entries.length
              ? Math.round((mastered / entries.length) * 100)
              : 0;
            const status = !overview
              ? "Loading..."
              : overview.error
                ? "Unavailable"
                : `${ready} ready`;

            return (
              <Box
                component="li"
                key={option.key}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "minmax(0, 1fr) auto",
                    sm: "minmax(0, 1fr) minmax(150px, 0.8fr) minmax(88px, auto) auto",
                  },
                  alignItems: "center",
                  columnGap: { xs: 1.5, sm: 3 },
                  rowGap: 1.5,
                  py: { xs: 2, sm: 2.5 },
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    component="h3"
                    variant="subtitle1"
                    sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
                  >
                    {option.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: { xs: "block", sm: "none" } }}
                  >
                    {status}
                  </Typography>
                </Box>
                <Stack
                  spacing={0.75}
                  sx={{
                    minWidth: 0,
                    gridColumn: { xs: "1 / -1", sm: "auto" },
                    gridRow: { xs: 2, sm: "auto" },
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between", gap: 1 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {overview && !overview.error
                        ? `${mastered} of ${entries.length} mastered`
                        : "Progress"}
                    </Typography>
                    {overview && !overview.error && (
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {percent}%
                      </Typography>
                    )}
                  </Stack>
                  {!overview?.error && (
                    <LinearProgress
                      variant={overview ? "determinate" : "indeterminate"}
                      value={percent}
                      aria-label={`${option.label} mastered progress`}
                      sx={{ height: 6, borderRadius: 1 }}
                    />
                  )}
                </Stack>
                <Typography
                  variant="body2"
                  sx={{
                    display: { xs: "none", sm: "block" },
                    color:
                      overview && !overview.error && ready > 0
                        ? "warning.main"
                        : "text.secondary",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {status}
                </Typography>
                <Button
                  variant={ready > 0 ? "contained" : "outlined"}
                  size="small"
                  startIcon={
                    loadingGroup === option.key ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <PlayArrowRounded />
                    )
                  }
                  aria-label={`Review ${option.label}`}
                  disabled={Boolean(loadingGroup)}
                  onClick={() => void startReview(option.key)}
                  sx={{
                    minWidth: 100,
                    gridColumn: { xs: 2, sm: "auto" },
                    gridRow: { xs: 1, sm: "auto" },
                  }}
                >
                  Review
                </Button>
              </Box>
            );
          })}
        </Box>
      </Box>
    </>
  );
}
