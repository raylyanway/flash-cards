import { SettingsRounded } from "@mui/icons-material";

import { Button, Stack } from "@mui/material";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { deleteAppDatabase, setCachedDataVersion } from "../DB";

export function SettingsScreen() {
  const handleDeleteDatabase = async () => {
    const confirmed = confirm(
      "Delete the saved app database? This will remove all stored progress and content data in IndexedDB.",
    );
    if (!confirmed) return;

    try {
      await deleteAppDatabase();
      await setCachedDataVersion(0);
      alert(
        "App database deleted. The app will reload to recreate fresh storage.",
      );
      location.reload();
    } catch (error) {
      console.error("Unable to delete database:", error);
      alert("Could not delete the database. Close other tabs and try again.");
    }
  };

  return (
    <>
      <PageHeader
        icon={<SettingsRounded />}
        title="Settings"
        description="Adjust the experience to fit your device and your study habits."
      />

      <Stack spacing={3}>
        <SectionCard
          title="Database"
          subtitle="Delete the saved app database and reset IndexedDB data. This does not remove your content files."
          sx={{ borderColor: "rgba(239,68,68,0.22)" }}
        >
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteDatabase}
          >
            Delete database
          </Button>
        </SectionCard>
      </Stack>
    </>
  );
}
