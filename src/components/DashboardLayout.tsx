import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import { Container, IconButton, Tooltip } from "@mui/material";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import * as React from "react";
import { Outlet } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardLayout() {
  const theme = useTheme();

  const [isDesktopNavigationExpanded, setIsDesktopNavigationExpanded] =
    React.useState(true);
  const [isMobileNavigationExpanded, setIsMobileNavigationExpanded] =
    React.useState(false);

  const isOverMdViewport = useMediaQuery(theme.breakpoints.up("md"));

  const isNavigationExpanded = isOverMdViewport
    ? isDesktopNavigationExpanded
    : isMobileNavigationExpanded;

  const setIsNavigationExpanded = React.useCallback(
    (newExpanded: boolean) => {
      if (isOverMdViewport) {
        setIsDesktopNavigationExpanded(newExpanded);
      } else {
        setIsMobileNavigationExpanded(newExpanded);
      }
    },
    [
      isOverMdViewport,
      setIsDesktopNavigationExpanded,
      setIsMobileNavigationExpanded,
    ],
  );

  const handleMenuOpen = React.useCallback(() => {
    setIsNavigationExpanded(!isNavigationExpanded);
  }, [isNavigationExpanded, setIsNavigationExpanded]);

  const layoutRef = React.useRef<HTMLDivElement>(null);
  const expandMenuActionText = "Expand";
  const collapseMenuActionText = "Collapse";

  return (
    <Box
      ref={layoutRef}
      sx={{
        position: "relative",
        display: "flex",
        overflow: "hidden",
        height: "100%",
        width: "100%",
      }}
    >
      <DashboardSidebar
        expanded={isNavigationExpanded}
        setExpanded={setIsNavigationExpanded}
        container={layoutRef?.current ?? undefined}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minWidth: 0,
        }}
      >
        <Box
          component="main"
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "auto",
          }}
        >
          <Container>
            <Tooltip
              title={`${isNavigationExpanded ? collapseMenuActionText : expandMenuActionText} menu`}
              enterDelay={1000}
            >
              <div>
                <IconButton
                  size="small"
                  aria-label={`${isNavigationExpanded ? collapseMenuActionText : expandMenuActionText} navigation menu`}
                  onClick={handleMenuOpen}
                >
                  {isNavigationExpanded ? <MenuOpenIcon /> : <MenuIcon />}
                </IconButton>
              </div>
            </Tooltip>
          </Container>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
