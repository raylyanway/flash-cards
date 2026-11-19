import {
  AutoStoriesRounded,
  DarkModeRounded,
  DeleteOutlineRounded,
  DevicesRounded,
  LightModeRounded,
  PaletteRounded,
  SettingsRounded,
  StorageRounded,
} from "@mui/icons-material";

import {
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { PageHeader } from "../components/PageHeader";
import { deleteAppDatabase } from "../db";
import { useAppStore } from "../store/useAppStore";
import type { ThemePreference } from "../types";

function SettingsSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Box
      component="section"
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "180px minmax(0, 1fr)" },
        gap: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 4 },
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            display: "grid",
            placeItems: "center",
            borderRadius: 1,
            bgcolor: "action.selected",
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

export function SettingsScreen() {
  const { mode, setMode } = useColorScheme();
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

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <SettingsSection title="Appearance" icon={<PaletteRounded />}>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Theme
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={mode ?? "system"}
            onChange={(_, value: ThemePreference | null) => {
              if (value) setMode(value);
            }}
            aria-label="Theme"
            sx={{ maxWidth: 420 }}
          >
            <ToggleButton value="system" aria-label="System theme">
              <DevicesRounded fontSize="small" sx={{ mr: 1 }} />
              System
            </ToggleButton>
            <ToggleButton value="light" aria-label="Light theme">
              <LightModeRounded fontSize="small" sx={{ mr: 1 }} />
              Light
            </ToggleButton>
            <ToggleButton value="dark" aria-label="Dark theme">
              <DarkModeRounded fontSize="small" sx={{ mr: 1 }} />
              Dark
            </ToggleButton>
          </ToggleButtonGroup>
        </SettingsSection>
        <SettingsSection title="Learning" icon={<AutoStoriesRounded />}>
          <Stack
            divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />}
          >
            <FormControlLabel
              labelPlacement="start"
              sx={{ m: 0, py: 1, justifyContent: "space-between", gap: 2 }}
              control={
                <Switch
                  checked={isLeftHanded}
                  onChange={(event) => setIsLeftHanded(event.target.checked)}
                />
              }
              label="Left-handed mode"
            />
            <FormControlLabel
              labelPlacement="start"
              sx={{ m: 0, py: 1, justifyContent: "space-between", gap: 2 }}
              control={
                <Switch
                  checked={autoPronounce}
                  onChange={(event) => setAutoPronounce(event.target.checked)}
                />
              }
              label="Automatically pronounce new cards"
            />
          </Stack>
        </SettingsSection>
        <SettingsSection title="Data" icon={<StorageRounded />}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Delete database
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Removes saved progress and stored content data. Content files are
            not affected.
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineRounded />}
            onClick={handleDeleteDatabase}
            sx={{ mt: 2 }}
          >
            Delete database
          </Button>
        </SettingsSection>
      </Box>
    </>
  );
}
