import {
  DeleteRounded,
  DownloadRounded,
  FileUploadRounded,
  LibraryBooksRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { type ChangeEvent, useRef, useState } from "react";
import {
  createCsvFromCards,
  DEFAULT_CONTENT,
  deleteContent,
  getAllCardsForSet,
  getContentBaseName,
  getContentDisplayName,
  getContentOptions,
  getDisplayNameForSet,
  getUniqueContentNames,
  importContent,
  parseCsvToJson,
  setContentMetadata,
  setSettingsToDB,
} from "../../cardData";
import { useAppStore } from "../../store/useAppStore";
import { downloadCsv } from "../../utils/downloadCsv";
import { PageHeader } from "../ui/PageHeader";

export function ContentScreen() {
  const importContentInputRef = useRef<HTMLInputElement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const theme = useAppStore((state) => state.theme);
  const contentOptions = useAppStore((state) => state.contentOptions);
  const currentSet = useAppStore((state) => state.currentSet);
  const setContentOptions = useAppStore((state) => state.setContentOptions);
  const setCurrentSet = useAppStore((state) => state.setCurrentSet);
  const loadSetData = useAppStore((state) => state.loadSetData);
  const refreshContentOptions = useAppStore(
    (state) => state.refreshContentOptions,
  );

  const isDefaultSet = DEFAULT_CONTENT.some((item) => item.key === currentSet);
  const selectedLabel =
    contentOptions.find((option) => option.key === currentSet)?.label ??
    currentSet;

  const exportContent = async () => {
    try {
      const allCards = await getAllCardsForSet(currentSet);
      if (!allCards.length) {
        alert("Nothing to export for this content set.");
        return;
      }
      downloadCsv(
        createCsvFromCards(
          allCards.map((card) => {
            const exportedCard = { ...card };
            delete exportedCard.setName;
            return exportedCard;
          }),
        ),
        `${currentSet}.csv`,
      );
    } catch (error) {
      console.error("exportContent failed:", error);
      alert("Unable to export content. See console for details.");
    }
  };

  const handleImportContent = (event: ChangeEvent<HTMLInputElement>) => {
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
        const setName = getContentBaseName(file.name);
        if (!setName) {
          throw new Error(
            "Unable to infer content name from the uploaded file name.",
          );
        }

        const existing = await getUniqueContentNames();
        if (existing.includes(setName)) {
          const confirmed = confirm(
            `A content named "${setName}" already exists. Overwrite it?`,
          );
          if (!confirmed) return;
        }

        const displayName = getDisplayNameForSet(setName);
        await importContent(setName, data);
        await setContentMetadata({
          setName,
          displayName,
          importedAt: Date.now(),
        });
        await refreshContentOptions(setName);
        setCurrentSet(setName);
        await setSettingsToDB({ currentSet: setName, theme });
        await loadSetData(setName);
        alert(`Content "${displayName}" imported successfully.`);
      } catch (error) {
        alert(`Failed to import content: ${(error as Error).message}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteContent = async () => {
    if (isDefaultSet) {
      alert("Default content sets cannot be deleted.");
      return;
    }

    const displayName = await getContentDisplayName(currentSet);
    if (
      !confirm(
        `Delete content "${displayName}"? This will remove the content and its progress.`,
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteContent(currentSet);
      const options = await getContentOptions();
      const nextSet = options[0]?.key || "body-parts";
      setContentOptions(options);
      setCurrentSet(nextSet);
      await setSettingsToDB({ currentSet: nextSet, theme });
      await loadSetData(nextSet);
      alert(`Content "${displayName}" deleted.`);
    } catch (error) {
      console.error("Failed to delete content:", error);
      alert("Unable to delete content. See console for details.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSet = event.target.value;
    setCurrentSet(nextSet);
    await setSettingsToDB({ currentSet: nextSet, theme });
    await loadSetData(nextSet);
  };

  return (
    <>
      <PageHeader
        icon={<LibraryBooksRounded />}
        title="Content library"
        description="Manage your collections, import new decks, and back up your progress."
      />

      <Stack spacing={3}>
        <Card elevation={0} sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Active collection
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedLabel}
                </Typography>
              </Box>
              <FormControl sx={{ minWidth: 220 }} size="small">
                <InputLabel id="content-set-select">Collection</InputLabel>
                <Select
                  labelId="content-set-select"
                  label="Collection"
                  value={currentSet}
                  onChange={handleSetChange}
                >
                  {contentOptions.map((option) => (
                    <MenuItem key={option.key} value={option.key}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Chip
              label={
                isDefaultSet ? "Built-in collection" : "Imported collection"
              }
              color={isDefaultSet ? "primary" : "success"}
              sx={{ mt: 2 }}
            />
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ borderRadius: 4, height: "100%" }}>
              <CardContent
                sx={{
                  p: { xs: 2, md: 3 },
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Stack spacing={2} sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                    }}
                  >
                    <DownloadRounded />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Export a backup
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Download this collection as a CSV file and keep an offline
                      copy.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<DownloadRounded />}
                    onClick={exportContent}
                    sx={{ mt: "auto" }}
                  >
                    Export CSV
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Card elevation={0} sx={{ borderRadius: 4, height: "100%" }}>
              <CardContent
                sx={{
                  p: { xs: 2, md: 3 },
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Stack spacing={2} sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "secondary.main",
                      color: "common.white",
                    }}
                  >
                    <FileUploadRounded />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Import a collection
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add a CSV collection and continue studying from any
                      device.
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    startIcon={<FileUploadRounded />}
                    onClick={() => importContentInputRef.current?.click()}
                    sx={{ mt: "auto" }}
                  >
                    Choose CSV
                  </Button>
                  <input
                    ref={importContentInputRef}
                    type="file"
                    hidden
                    accept=".csv"
                    onChange={handleImportContent}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card
          elevation={0}
          sx={{ borderRadius: 4, borderColor: "rgba(239,68,68,0.22)" }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Danger zone
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Delete this collection
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Deletes the collection and all of its saved learning progress.
                </Typography>
              </Box>
              <Button
                variant="contained"
                color="error"
                startIcon={<DeleteRounded />}
                disabled={isDefaultSet || isDeleting}
                onClick={handleDeleteContent}
              >
                {isDeleting ? "Deleting..." : "Delete collection"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </>
  );
}
