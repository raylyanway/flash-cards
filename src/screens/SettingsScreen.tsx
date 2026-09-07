import { SettingsRounded } from "@mui/icons-material";
import { Button, Stack } from "@mui/material";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { deleteAppDatabase, setCachedDataVersion } from "../DB";

// const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];

// function getThemeDescription(option: ThemePreference) {
//   if (option === "system") return "Follow your device theme preference.";
//   if (option === "light") return "Soft, bright, and easy on the eyes.";
//   return "High-contrast dark mode for focused study sessions.";
// }

export function SettingsScreen() {
  // const theme = useAppStore((state) => state.theme);
  // const currentSet = useAppStore((state) => state.currentSet);
  // const setTheme = useAppStore((state) => state.setTheme);

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

  // const handleThemeChange = async (nextTheme: ThemePreference) => {
  //   setTheme(nextTheme);
  //   await setSettingsToDB({ currentSet, theme: nextTheme });
  // };

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
