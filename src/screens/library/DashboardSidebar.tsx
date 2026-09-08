import BarChartIcon from "@mui/icons-material/BarChart";
import DescriptionIcon from "@mui/icons-material/Description";
import LayersIcon from "@mui/icons-material/Layers";

import PersonIcon from "@mui/icons-material/Person";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import { useTheme, type Theme } from "@mui/material/styles";
import type {} from "@mui/material/themeCssVarsAugmentation";
import useMediaQuery from "@mui/material/useMediaQuery";
import * as React from "react";
import { matchPath, useLocation } from "react-router-dom";
import { DRAWER_WIDTH, MINI_DRAWER_WIDTH } from "../../constants";
import DashboardSidebarContext from "../../context/DashboardSidebarContext";
import getDrawerSxTransitionMixin from "../../mixins";
import { useAppStore } from "../../store/useAppStore";
import DashboardSidebarDividerItem from "./DashboardSidebarDividerItem";
import DashboardSidebarHeaderItem from "./DashboardSidebarHeaderItem";
import DashboardSidebarPageItem from "./DashboardSidebarPageItem";

export interface DashboardSidebarProps {
  disableCollapsibleSidebar?: boolean;
  container?: Element;
}

export default function DashboardSidebar({
  disableCollapsibleSidebar = false,
  container,
}: DashboardSidebarProps) {
  const navExpanded = useAppStore((s) => s.navExpanded);
  const setNavExpanded = useAppStore((s) => s.setNavExpanded);
  const theme = useTheme();

  const { pathname } = useLocation();

  const [expandedItemIds, setExpandedItemIds] = React.useState<string[]>([]);

  const isOverSmViewport = useMediaQuery(theme.breakpoints.up("sm"));
  const isOverMdViewport = useMediaQuery(theme.breakpoints.up("md"));
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)",
  );
  const shouldReduceDrawerMotion =
    theme.motion.reducedMotion === "always" ||
    (theme.motion.reducedMotion === "system" && prefersReducedMotion);
  const drawerEnteringDuration = shouldReduceDrawerMotion
    ? 0
    : theme.transitions.duration.enteringScreen;
  const drawerLeavingDuration = shouldReduceDrawerMotion
    ? 0
    : theme.transitions.duration.leavingScreen;

  const [isFullyExpanded, setIsFullyExpanded] = React.useState(navExpanded);
  const [isFullyCollapsed, setIsFullyCollapsed] = React.useState(!navExpanded);

  React.useEffect(() => {
    if (navExpanded) {
      if (drawerEnteringDuration === 0) {
        setIsFullyExpanded(true);
        return undefined;
      }

      const drawerWidthTransitionTimeout = setTimeout(() => {
        setIsFullyExpanded(true);
      }, drawerEnteringDuration);

      return () => clearTimeout(drawerWidthTransitionTimeout);
    }

    setIsFullyExpanded(false);

    return undefined;
  }, [drawerEnteringDuration, navExpanded]);

  React.useEffect(() => {
    if (!navExpanded) {
      if (drawerLeavingDuration === 0) {
        setIsFullyCollapsed(true);
        return undefined;
      }

      const drawerWidthTransitionTimeout = setTimeout(() => {
        setIsFullyCollapsed(true);
      }, drawerLeavingDuration);

      return () => clearTimeout(drawerWidthTransitionTimeout);
    }

    setIsFullyCollapsed(false);

    return undefined;
  }, [drawerLeavingDuration, navExpanded]);

  const mini = !disableCollapsibleSidebar && !navExpanded;

  const handleSetSidebarExpanded = React.useCallback(
    (newExpanded: boolean) => () => {
      setNavExpanded(newExpanded);
    },
    [setNavExpanded],
  );

  const handlePageItemClick = React.useCallback(
    (itemId: string, hasNestedNavigation: boolean) => {
      if (hasNestedNavigation && !mini) {
        setExpandedItemIds((previousValue) =>
          previousValue.includes(itemId)
            ? previousValue.filter(
                (previousValueItemId) => previousValueItemId !== itemId,
              )
            : [...previousValue, itemId],
        );
      } else if (!isOverSmViewport && !hasNestedNavigation) {
        setNavExpanded(false);
      }
    },
    [mini, setNavExpanded, isOverSmViewport],
  );

  const hasDrawerTransitions =
    isOverSmViewport && (!disableCollapsibleSidebar || isOverMdViewport);

  const getDrawerContent = React.useCallback(
    (viewport: "phone" | "tablet" | "desktop") => (
      <React.Fragment>
        <Box
          component="nav"
          aria-label={`${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}`}
          sx={[
            {
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              overflow: "auto",
              scrollbarGutter: mini ? "stable" : "auto",
              overflowX: "hidden",
              pt: !mini ? 0 : 2,
            },
            hasDrawerTransitions
              ? getDrawerSxTransitionMixin(isFullyExpanded, "padding")
              : null,
          ]}
        >
          <List
            dense
            sx={{
              padding: mini ? 0 : 0.5,
              mb: 4,
              width: mini ? MINI_DRAWER_WIDTH : "auto",
            }}
          >
            <DashboardSidebarHeaderItem>Main items</DashboardSidebarHeaderItem>
            <DashboardSidebarPageItem
              id="employees"
              title="Employees"
              icon={<PersonIcon />}
              href="/library/employees"
              selected={
                !!matchPath("/library/employees/*", pathname) ||
                pathname === "/library" ||
                pathname === "/library/"
              }
            />
            <DashboardSidebarDividerItem />
            <DashboardSidebarHeaderItem>
              Example items
            </DashboardSidebarHeaderItem>
            <DashboardSidebarPageItem
              id="reports"
              title="Reports"
              icon={<BarChartIcon />}
              href="/reports"
              selected={!!matchPath("/reports", pathname)}
              defaultExpanded={!!matchPath("/reports", pathname)}
              expanded={expandedItemIds.includes("reports")}
              nestedNavigation={
                <List
                  dense
                  sx={{
                    padding: 0,
                    my: 1,
                    pl: mini ? 0 : 1,
                    minWidth: 240,
                  }}
                >
                  <DashboardSidebarPageItem
                    id="sales"
                    title="Sales"
                    icon={<DescriptionIcon />}
                    href="/reports/sales"
                    selected={!!matchPath("/reports/sales", pathname)}
                  />
                  <DashboardSidebarPageItem
                    id="traffic"
                    title="Traffic"
                    icon={<DescriptionIcon />}
                    href="/reports/traffic"
                    selected={!!matchPath("/reports/traffic", pathname)}
                  />
                </List>
              }
            />
            <DashboardSidebarPageItem
              id="integrations"
              title="Integrations"
              icon={<LayersIcon />}
              href="/integrations"
              selected={!!matchPath("/integrations", pathname)}
            />
          </List>
        </Box>
      </React.Fragment>
    ),
    [mini, hasDrawerTransitions, isFullyExpanded, expandedItemIds, pathname],
  );

  const getDrawerSharedSx = React.useCallback(
    (isTemporary: boolean) => (drawerTheme: Theme) => {
      const drawerWidth = mini ? MINI_DRAWER_WIDTH : DRAWER_WIDTH;
      const widthTransitionStyles = getDrawerSxTransitionMixin(
        navExpanded,
        "width",
      )(drawerTheme);

      return {
        displayPrint: "none",
        width: drawerWidth,
        flexShrink: 0,
        ...widthTransitionStyles,
        overflowX: "hidden",
        ...(isTemporary ? { position: "absolute" } : {}),
        [`& .MuiDrawer-paper`]: {
          position: "absolute",
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundImage: "none",
          ...widthTransitionStyles,
          overflowX: "hidden",
        },
      };
    },
    [navExpanded, mini],
  );

  const sidebarContextValue = React.useMemo(() => {
    return {
      onPageItemClick: handlePageItemClick,
      mini,
      fullyExpanded: isFullyExpanded,
      fullyCollapsed: isFullyCollapsed,
      hasDrawerTransitions,
    };
  }, [
    handlePageItemClick,
    mini,
    isFullyExpanded,
    isFullyCollapsed,
    hasDrawerTransitions,
  ]);

  return (
    <DashboardSidebarContext.Provider value={sidebarContextValue}>
      <Drawer
        container={container}
        variant="temporary"
        open={navExpanded}
        onClose={handleSetSidebarExpanded(false)}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
          disableScrollLock: true,
        }}
        sx={[
          {
            display: {
              xs: "block",
              sm: disableCollapsibleSidebar ? "block" : "none",
              md: "none",
            },
          },
          getDrawerSharedSx(true),
        ]}
      >
        {getDrawerContent("phone")}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={[
          {
            display: {
              xs: "none",
              sm: disableCollapsibleSidebar ? "none" : "block",
              md: "none",
            },
          },
          getDrawerSharedSx(false),
        ]}
      >
        {getDrawerContent("tablet")}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={[
          { display: { xs: "none", md: "block" } },
          getDrawerSharedSx(false),
        ]}
      >
        {getDrawerContent("desktop")}
      </Drawer>
    </DashboardSidebarContext.Provider>
  );
}
