import {
  AnalyticsRounded,
  BookRounded,
  HomeRounded,
  MenuRounded,
  SettingsRounded,
  StorageRounded,
} from "@mui/icons-material";
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import type { Screen } from "../../types";

const NAV_ITEMS: Array<{
  screen: Screen;
  label: string;
  icon: typeof HomeRounded;
}> = [
  { screen: "home", label: "Home", icon: HomeRounded },
  { screen: "content", label: "Content", icon: StorageRounded },
  { screen: "analytics", label: "Analytics", icon: AnalyticsRounded },
  { screen: "settings", label: "Settings", icon: SettingsRounded },
  { screen: "library", label: "Library", icon: BookRounded },
];

export function NavBar() {
  const screen = useAppStore((state) => state.screen);
  const setScreen = useAppStore((state) => state.setScreen);
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleClick = (nextScreen: Screen) => {
    setScreen(nextScreen);
    setIsOpen(false);
  };

  const navButtons = NAV_ITEMS.map(
    ({ screen: itemScreen, label, icon: Icon }) => (
      <Button
        key={itemScreen}
        color={screen === itemScreen ? "primary" : "inherit"}
        variant={screen === itemScreen ? "contained" : "text"}
        startIcon={<Icon fontSize="small" />}
        onClick={() => handleClick(itemScreen)}
        sx={{
          borderRadius: 999,
          px: 2,
          py: 0.75,
          minWidth: 0,
          fontWeight: 600,
        }}
      >
        {label}
      </Button>
    ),
  );

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      sx={{
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid",
        borderColor: "divider",
        backgroundColor: (theme) =>
          theme.palette.mode === "light"
            ? "rgba(246, 247, 242, 0.78)"
            : "rgba(16, 28, 33, 0.82)",
      }}
    >
      <Toolbar
        sx={{
          width: "min(1200px, calc(100% - 32px))",
          mx: "auto",
          minHeight: 72,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: "100%" }}
        >
          <Box>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "9px 9px 9px 3px",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 15,
                  fontWeight: 900,
                  transform: "rotate(-8deg)",
                }}
              >
                f
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Flash Cards
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Learn deliberately
                </Typography>
              </Box>
            </Stack>
          </Box>

          {mobile ? (
            <>
              <IconButton
                color="inherit"
                aria-label={isOpen ? "Close navigation" : "Open navigation"}
                aria-expanded={isOpen}
                onClick={() => setIsOpen((current) => !current)}
                sx={{ border: "1px solid", borderColor: "divider" }}
              >
                <MenuRounded />
              </IconButton>
              <Drawer
                anchor="top"
                open={isOpen}
                onClose={() => setIsOpen(false)}
              >
                <List sx={{ px: 1, py: 2 }}>
                  {NAV_ITEMS.map(
                    ({ screen: itemScreen, label, icon: Icon }) => (
                      <ListItemButton
                        key={itemScreen}
                        selected={screen === itemScreen}
                        onClick={() => handleClick(itemScreen)}
                      >
                        <Box component={Icon} sx={{ mr: 1.5 }} />
                        <ListItemText primary={label} />
                      </ListItemButton>
                    ),
                  )}
                </List>
              </Drawer>
            </>
          ) : (
            <Stack direction="row" spacing={1}>
              {navButtons}
            </Stack>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
