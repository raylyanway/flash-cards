import {
  ArrowBackRounded,
  DownloadRounded,
  UploadRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { type ChangeEvent, useRef } from "react";
import { createCsvFromProgress, parseCsvToJson } from "../cardData";
import { useAppStore } from "../store/useAppStore";
import type { Card as CardModel, ProgressMap } from "../types";
import { getStageName, initializeMissingProgress } from "../utils/cardProgress";
import { downloadCsv } from "../utils/downloadCsv";

export function ProgressSetupScreen() {
  const importProgressInputRef = useRef<HTMLInputElement | null>(null);

  const cards = useAppStore((state) => state.cards);
  const currentSet = useAppStore((state) => state.currentSet);
  const progress = useAppStore((state) => state.progress);
  const progressSearch = useAppStore((state) => state.progressSearch);
  const setupBackup = useAppStore((state) => state.setupBackup);

  const saveProgress = useAppStore((state) => state.saveProgress);
  const setProgress = useAppStore((state) => state.setProgress);
  const setProgressSearch = useAppStore((state) => state.setProgressSearch);
  const setScreen = useAppStore((state) => state.setScreen);
  const setSetupBackup = useAppStore((state) => state.setSetupBackup);

  const filteredCards = cards.filter((card) =>
    card.text.toLowerCase().includes(progressSearch.toLowerCase()),
  );

  const closeProgressSetup = () => {
    if (setupBackup) {
      setProgress(setupBackup);
      setSetupBackup(null);
    }
    setScreen("analytics");
  };

  const doneProgressSetup = async () => {
    await saveProgress(progress);
    setSetupBackup(null);
    setScreen("analytics");
  };

  const exportProgress = () => {
    if (!cards.length) {
      alert("Nothing to export for this content.");
      return;
    }
    downloadCsv(
      createCsvFromProgress(progress, cards),
      `${currentSet}-progress-${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  const handleImportProgress = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a .csv file only.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const data = parseCsvToJson(String(loadEvent.target?.result || ""));
        const importedProgress: ProgressMap = {};
        for (const row of data) {
          const text = String(row.text || "").trim();
          if (!text) continue;
          importedProgress[text] = {
            stage: Number(row.stage) || 0,
            nextReview: Number(row.nextReview) || 0,
            correctCount: Number(row.correctCount) || 0,
          };
        }

        if (Object.keys(importedProgress).length === 0) {
          throw new Error("No valid progress rows found.");
        }

        const confirmed = confirm(
          `Import progress for "${currentSet}"? This will overwrite progress for matching cards.`,
        );
        if (!confirmed) return;

        const nextProgress = initializeMissingProgress(cards, {
          ...progress,
          ...importedProgress,
        });
        await saveProgress(nextProgress);
        alert("Progress imported successfully!");
      } catch (error) {
        alert(`Failed to import progress: ${(error as Error).message}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const setAllStages = (stage: number) => {
    const nextProgress: ProgressMap = {};
    for (const card of cards) {
      nextProgress[card.text] = {
        stage,
        nextReview: 0,
        correctCount: stage === 3 ? 3 : 0,
      };
    }
    setProgress(nextProgress);
  };

  const setCardStage = (card: CardModel, stage: number) => {
    setProgress({
      ...progress,
      [card.text]: {
        ...progress[card.text],
        stage,
        nextReview: 0,
        correctCount:
          stage === 3
            ? Math.max(progress[card.text]?.correctCount || 0, 3)
            : progress[card.text]?.correctCount || 0,
      },
    });
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Button
          variant="text"
          startIcon={<ArrowBackRounded />}
          onClick={closeProgressSetup}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Setup progress
        </Typography>
      </Stack>

      <Card elevation={0} sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Bulk operations
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                {[0, 1, 3].map((stage) => (
                  <Button
                    key={stage}
                    variant="outlined"
                    onClick={() => setAllStages(stage)}
                  >
                    {stage === 0
                      ? "New"
                      : stage === 1
                        ? "Learning x1"
                        : "Learned"}
                  </Button>
                ))}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Individual card progress
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search cards..."
                value={progressSearch}
                onChange={(event) => setProgressSearch(event.target.value)}
              />

              <Stack spacing={1.5} sx={{ mt: 2 }}>
                {filteredCards.map((card) => {
                  const cardProgress = progress[card.text] || {
                    stage: 0,
                    correctCount: 0,
                  };
                  return (
                    <Card
                      key={card.text}
                      variant="outlined"
                      sx={{ borderRadius: 3 }}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 2,
                          py: 1.5,
                          px: 2,
                        }}
                      >
                        <Box>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600 }}
                          >
                            {card.text}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getStageName(cardProgress.stage)} ·{" "}
                            {cardProgress.correctCount || 0} correct
                          </Typography>
                        </Box>
                        <FormControl size="small" sx={{ minWidth: 170 }}>
                          <InputLabel id={`stage-${card.text}`}>
                            Stage
                          </InputLabel>
                          <Select
                            labelId={`stage-${card.text}`}
                            value={cardProgress.stage}
                            label="Stage"
                            onChange={(event) =>
                              setCardStage(card, Number(event.target.value))
                            }
                          >
                            <MenuItem value={0}>New</MenuItem>
                            <MenuItem value={1}>Learning x1</MenuItem>
                            <MenuItem value={2}>Learning x2</MenuItem>
                            <MenuItem value={3}>Learned</MenuItem>
                          </Select>
                        </FormControl>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                Import and export
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadRounded />}
                  onClick={exportProgress}
                >
                  Export progress
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UploadRounded />}
                  onClick={() => importProgressInputRef.current?.click()}
                >
                  Import progress
                </Button>
                <input
                  ref={importProgressInputRef}
                  type="file"
                  hidden
                  accept=".csv"
                  onChange={handleImportProgress}
                />
              </Stack>
            </Box>

            <Stack direction="row" justifyContent="flex-end">
              <Button variant="contained" onClick={doneProgressSetup}>
                Done
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
