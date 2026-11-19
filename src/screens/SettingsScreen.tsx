import { SettingsRounded } from "@mui/icons-material";

import {
  Button,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import ColorModeIconDropdown from "../components/ColorModeIconDropdown";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { deleteAppDatabase } from "../db";
import { useAppStore } from "../store/useAppStore";

export function SettingsScreen() {
  const isLeftHanded = useAppStore((state) => state.isLeftHanded);
  const setIsLeftHanded = useAppStore((state) => state.setIsLeftHanded);
  const autoPronounce = useAppStore((state) => state.autoPronounce);
  const setAutoPronounce = useAppStore((state) => state.setAutoPronounce);

  const handleDeleteDatabase = async () => {
    const confirmed = confirm(
      "Delete the saved app database? This will remove all stored progress and content data in IndexedDB.",
    );
    if (!confirmed) return;

    try {
      await deleteAppDatabase();
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
        <SectionCard title="Appearance">
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography>Theme</Typography>
            <ColorModeIconDropdown aria-label="Choose theme" />
          </Stack>
        </SectionCard>
        <SectionCard title="Learning">
          <Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={isLeftHanded}
                  onChange={(event) => setIsLeftHanded(event.target.checked)}
                />
              }
              label="Left-handed mode"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={autoPronounce}
                  onChange={(event) => setAutoPronounce(event.target.checked)}
                />
              }
              label="Automatically pronounce new cards"
            />
          </Stack>
        </SectionCard>
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
