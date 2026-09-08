import {
  AnalyticsRounded,
  BookRounded,
  HomeRounded,
  SettingsRounded,
  StorageRounded,
} from "@mui/icons-material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
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
  label: string;
  icon: typeof HomeRounded;
  path: string;
}> = [
  { label: "Home", icon: HomeRounded, path: "/" },
  { label: "Content", icon: StorageRounded, path: "/content" },
  { label: "Analytics", icon: AnalyticsRounded, path: "/analytics" },
  { label: "Settings", icon: SettingsRounded, path: "/settings" },
  { label: "Library", icon: BookRounded, path: "/library" },
];

const isNavItemSelected = (pathname: string, targetPath: string) => {
  if (targetPath === "/") {
    return pathname === "/";
  }

  if (targetPath === "/library") {
    return pathname === "/library" || pathname.startsWith("/library/");
  }

  if (targetPath === "/progress-setup") {
    return (
      pathname === "/progress-setup" || pathname.startsWith("/progress-setup/")
    );
  }

  return pathname === targetPath;
};

export function NavBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const activeNavItem = NAV_ITEMS.find(({ path }) =>
    isNavItemSelected(pathname, path),
  );
  const activeLabel = activeNavItem?.label ?? "";

  const [open, setOpen] = React.useState(false);
  const navExpanded = useAppStore((s) => s.navExpanded);
  const setNavExpanded = useAppStore((s) => s.setNavExpanded);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const showLibraryToggle = isNavItemSelected(pathname, "/library");

  const handleNavToggle = () => setNavExpanded(!navExpanded);

  const handleClick = (path: string) => () => {
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
          {showLibraryToggle ? (
            <IconButton
              size="small"
              onClick={handleNavToggle}
              aria-label={
                navExpanded
                  ? "Collapse navigation menu"
                  : "Expand navigation menu"
              }
              sx={{ mr: 1 }}
            >
              {navExpanded ? <MenuOpenIcon /> : <MenuIcon />}
            </IconButton>
          ) : null}

          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              alignItems: "center",
              columnGap: 5,
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{ display: { xs: "none", md: "block" } }}
            >
              Flash&nbsp;Cards
            </Typography>
            <Typography
              variant="h6"
              component="div"
              sx={{ display: { xs: "block", md: "none" } }}
            >
              {activeLabel}
            </Typography>
            <Box sx={{ display: { xs: "none", md: "flex", columnGap: 16 } }}>
              {NAV_ITEMS.map(({ label, path }) => {
                const isSelected = isNavItemSelected(pathname, path);

                return (
                  <Button
                    key={label}
                    sx={{
                      borderBottom: isSelected ? 1 : 0,
                      borderColor: "primary.main",
                    }}
                    color={isSelected ? "primary" : "inherit"}
                    variant="text"
                    onClick={handleClick(path)}
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
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              columnGap: 1,
              alignItems: "center",
            }}
          >
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
                  {NAV_ITEMS.map(({ label, path }) => (
                    <MenuItem
                      key={label}
                      selected={isNavItemSelected(pathname, path)}
                      onClick={handleClick(path)}
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
