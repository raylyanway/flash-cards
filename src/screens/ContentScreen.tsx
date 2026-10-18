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
import { FeatureActionCard } from "../components/FeatureActionCard";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import {
  DEFAULT_CONTENT,
  deleteContent,
  getAllCardsForGroup,
  getContentGroupBaseName,
  getContentDisplayName,
  getContentOptions,
  getDisplayNameForGroup,
  getUniqueContentGroups,
  importContent,
  setContentMetadata,
} from "../db";
import { useAppStore } from "../store/useAppStore";
import { createCsvFromCards, downloadCsv, parseCsv } from "../utils/csv";

export function ContentScreen() {
  const importContentInputRef = useRef<HTMLInputElement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const contentOptions = useAppStore((state) => state.contentOptions);
  const currentGroup = useAppStore((state) => state.currentGroup);
  const setContentOptions = useAppStore((state) => state.setContentOptions);
  const setCurrentGroup = useAppStore((state) => state.setCurrentGroup);
  const loadGroupData = useAppStore((state) => state.loadGroupData);
  const refreshContentOptions = useAppStore(
    (state) => state.refreshContentOptions,
  );

  const isDefaultGroup = DEFAULT_CONTENT.some(
    (item) => item.key === currentGroup,
  );
  const selectedLabel =
    contentOptions.find((option) => option.key === currentGroup)?.label ??
    currentGroup;

  const exportContent = async () => {
    try {
      const allCards = await getAllCardsForGroup(currentGroup);
      if (!allCards.length) {
        alert("Nothing to export for this content group.");
        return;
      }
      downloadCsv(
        createCsvFromCards(
          allCards.map((card) => {
            const exportedCard = { ...card };
            delete exportedCard.group;
            return exportedCard;
          }),
        ),
        `${currentGroup}.csv`,
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
        const data = parseCsv(String(loadEvent.target?.result || ""));
        const group = getContentGroupBaseName(file.name);
        if (!group) {
          throw new Error(
            "Unable to infer content name from the uploaded file name.",
          );
        }

        const existing = await getUniqueContentGroups();
        if (existing.includes(group)) {
          const confirmed = confirm(
            `A content named "${group}" already exists. Overwrite it?`,
          );
          if (!confirmed) return;
        }

        const displayName = getDisplayNameForGroup(group);
        await importContent(group, data);
        await setContentMetadata({
          group,
          displayName,
          importedAt: Date.now(),
        });
        await refreshContentOptions(group);
        setCurrentGroup(group);
        await loadGroupData(group);
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
    if (isDefaultGroup) {
      alert("Default content groups cannot be deleted.");
      return;
    }

    const displayName = await getContentDisplayName(currentGroup);
    if (
      !confirm(
        `Delete content "${displayName}"? This will remove the content and its progress.`,
      )
    ) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteContent(currentGroup);
      const options = await getContentOptions();
      const nextGroup = options[0]?.key || "body-parts";
      setContentOptions(options);
      setCurrentGroup(nextGroup);
      await loadGroupData(nextGroup);
      alert(`Content "${displayName}" deleted.`);
    } catch (error) {
      console.error("Failed to delete content:", error);
      alert("Unable to delete content. See console for details.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGroupChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextGroup = event.target.value;
    setCurrentGroup(nextGroup);
    await loadGroupData(nextGroup);
  };

  return (
    <>
      <PageHeader
        icon={<LibraryBooksRounded />}
        title="Content library"
        description="Manage your collections, import new decks, and back up your progress."
      />

      <Stack spacing={3}>
        <Card>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box>
                <Typography variant="overline" color="text.secondary">
                  Active collection
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedLabel}
                </Typography>
              </Box>
              <FormControl sx={{ minWidth: 220 }} size="small">
                <InputLabel id="content-group-select">Collection</InputLabel>
                <Select
                  labelId="content-group-select"
                  label="Collection"
                  value={currentGroup}
                  onChange={handleGroupChange}
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
                isDefaultGroup ? "Built-in collection" : "Imported collection"
              }
              color={isDefaultGroup ? "primary" : "success"}
              sx={{ mt: 2 }}
            />
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FeatureActionCard
              icon={<DownloadRounded />}
              accent="primary"
              title="Export a backup"
              description="Download this collection as a CSV file and keep an offline copy."
              actionLabel="Export CSV"
              onAction={exportContent}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <FeatureActionCard
              icon={<FileUploadRounded />}
              accent="secondary"
              title="Import a collection"
              description="Add a CSV collection and continue studying from any device."
              actionLabel="Choose CSV"
              onAction={() => importContentInputRef.current?.click()}
              extra={
                <input
                  ref={importContentInputRef}
                  type="file"
                  hidden
                  accept=".csv,text/csv"
                  onChange={handleImportContent}
                />
              }
            />
          </Grid>
        </Grid>

        <SectionCard
          title="Delete this collection"
          subtitle="Deletes the collection and all of its saved learning progress."
          sx={{ borderColor: "rgba(239,68,68,0.22)" }}
        >
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteRounded />}
            disabled={isDefaultGroup || isDeleting}
            onClick={handleDeleteContent}
          >
            {isDeleting ? "Deleting..." : "Delete collection"}
          </Button>
        </SectionCard>
      </Stack>
    </>
  );
}
