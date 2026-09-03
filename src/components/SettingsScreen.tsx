import { SettingsRounded } from "@mui/icons-material";
import {
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from "@mui/material";
import {
  deleteAppDatabase,
  setCachedDataVersion,
  setSettingsToDB,
} from "../cardData";
import { useAppStore } from "../store/useAppStore";
import type { ThemePreference } from "../types";
import { PageHeader } from "./ui/PageHeader";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];

function getThemeDescription(option: ThemePreference) {
  if (option === "system") return "Follow your device theme preference.";
  if (option === "light") return "Soft, bright, and easy on the eyes.";
  return "High-contrast dark mode for focused study sessions.";
}

export function SettingsScreen() {
  const theme = useAppStore((state) => state.theme);
  const currentSet = useAppStore((state) => state.currentSet);
  const setTheme = useAppStore((state) => state.setTheme);

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

  const handleThemeChange = async (nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    await setSettingsToDB({ currentSet, theme: nextTheme });
  };

  return (
    <>
      <PageHeader
        icon={<SettingsRounded />}
        title="Settings"
        description="Adjust the experience to fit your device and your study habits."
      />

      <Stack spacing={3}>
        <Card elevation={0} sx={{ borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              App theme
            </Typography>
            <FormControl>
              <RadioGroup
                value={theme}
                onChange={(event) =>
                  handleThemeChange(event.target.value as ThemePreference)
                }
              >
                {THEME_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option}
                    value={option}
                    control={<Radio />}
                    label={
                      <Stack spacing={0.2}>
                        <Typography
                          variant="subtitle2"
                          sx={{ textTransform: "capitalize" }}
                        >
                          {option}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {getThemeDescription(option)}
                        </Typography>
                      </Stack>
                    }
                    sx={{ py: 0.75, px: 1, borderRadius: 2 }}
                  />
                ))}
              </RadioGroup>
            </FormControl>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          sx={{ borderRadius: 4, borderColor: "rgba(239,68,68,0.22)" }}
        >
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Database
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Delete the saved app database and reset IndexedDB data. This does
              not remove your content files.
            </Typography>
            <Button
              variant="contained"
              color="error"
              onClick={handleDeleteDatabase}
            >
              Delete database
            </Button>
          </CardContent>
        </Card>
      </Stack>
    </>
  );
}
