import {
  AnalyticsRounded,
  BookRounded,
  HomeRounded,
  SettingsRounded,
  StorageRounded,
} from "@mui/icons-material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MenuIcon from "@mui/icons-material/Menu";
import { MenuItem } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import MenuList from "@mui/material/MenuList";
import { alpha, styled } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import type { Screen } from "../types";
import ColorModeIconDropdown from "./ColorModeIconDropdown";

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
  borderRadius: `calc(${theme.shape.borderRadius}px + 8px)`,
  backdropFilter: "blur(24px)",
  border: "1px solid",
  borderColor: (theme.vars || theme).palette.divider,
  backgroundColor: theme.vars
    ? `rgba(${theme.vars.palette.background.defaultChannel} / 0.4)`
    : alpha(theme.palette.background.default, 0.4),
  boxShadow: (theme.vars || theme).shadows[1],
  padding: "8px 12px",
}));

const NAV_ITEMS: Array<{
  screen: Screen;
  label: string;
  icon: typeof HomeRounded;
  path: string;
}> = [
  { screen: "home", label: "Home", icon: HomeRounded, path: "/" },
  {
    screen: "content",
    label: "Content",
    icon: StorageRounded,
    path: "/content",
  },
  {
    screen: "analytics",
    label: "Analytics",
    icon: AnalyticsRounded,
    path: "/analytics",
  },
  {
    screen: "settings",
    label: "Settings",
    icon: SettingsRounded,
    path: "/settings",
  },
  { screen: "library", label: "Library", icon: BookRounded, path: "/library" },
];

const getScreenFromPath = (pathname: string): Screen => {
  if (pathname === "/") {
    return "home";
  }

  if (pathname.startsWith("/library")) {
    return "library";
  }

  if (pathname.startsWith("/progress-setup")) {
    return "progressSetup";
  }

  const pathScreenMap: Record<string, Screen> = {
    "/learn": "learn",
    "/analytics": "analytics",
    "/settings": "settings",
    "/content": "content",
  };

  return pathScreenMap[pathname] ?? "home";
};

export function NavBar() {
  const screen = useAppStore((state) => state.screen);
  const setScreen = useAppStore((state) => state.setScreen);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setScreen(getScreenFromPath(pathname));
  }, [pathname, setScreen]);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const handleClick = (screen: Screen, path: string) => () => {
    setScreen(screen);
    navigate(path);
    setOpen(false);
  };

  return (
    <AppBar
      enableColorOnDark
      sx={{
        boxShadow: 0,
        color: "text.primary",
        bgcolor: "transparent",
        backgroundImage: "none",
        mt: "1.5rem",
      }}
    >
      <Container maxWidth="lg">
        <StyledToolbar variant="dense" disableGutters>
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              columnGap: 5,
            }}
          >
            <Typography variant="h6" component="div">
              Flash&nbsp;Cards
            </Typography>
            <Box sx={{ display: { xs: "none", md: "flex", columnGap: 16 } }}>
              {NAV_ITEMS.map(({ label, screen: itemScreen, path }) => {
                const isSelected = getScreenFromPath(pathname) === itemScreen;

                return (
                  <Button
                    key={label}
                    sx={{
                      borderBottom: isSelected ? 1 : 0,
                      borderColor: "primary.main",
                    }}
                    color={isSelected ? "primary" : "inherit"}
                    variant="text"
                    onClick={handleClick(itemScreen, path)}
                  >
                    {label}
                  </Button>
                );
              })}
            </Box>
          </Box>
          <ColorModeIconDropdown
            sx={{ display: { xs: "none", md: "block" } }}
          />
          <Box sx={{ display: { xs: "flex", md: "none" }, columnGap: 1 }}>
            <ColorModeIconDropdown size="medium" />
            <IconButton aria-label="Menu button" onClick={toggleDrawer(true)}>
              <MenuIcon />
            </IconButton>
            <Drawer
              anchor="top"
              open={open}
              onClose={toggleDrawer(false)}
              slotProps={{
                paper: {
                  sx: {
                    top: "var(--template-frame-height, 0px)",
                  },
                },
              }}
            >
              <Box sx={{ p: 2, backgroundColor: "background.default" }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <IconButton onClick={toggleDrawer(false)}>
                    <CloseRoundedIcon />
                  </IconButton>
                </Box>
                <MenuList>
                  {NAV_ITEMS.map(({ label, screen: itemScreen, path }) => (
                    <MenuItem
                      key={label}
                      selected={getScreenFromPath(pathname) === itemScreen}
                      onClick={handleClick(itemScreen, path)}
                    >
                      {label}
                    </MenuItem>
                  ))}
                </MenuList>
              </Box>
            </Drawer>
          </Box>
        </StyledToolbar>
      </Container>
    </AppBar>
  );
}
