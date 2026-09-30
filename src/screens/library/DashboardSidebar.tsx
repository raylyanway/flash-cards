import BarChartIcon from "@mui/icons-material/BarChart";
import DescriptionIcon from "@mui/icons-material/Description";
import LayersIcon from "@mui/icons-material/Layers";

import PersonIcon from "@mui/icons-material/Person";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import * as React from "react";
import { matchPath, useLocation } from "react-router-dom";
import DashboardSidebarContext from "../../context/DashboardSidebarContext";
import { useAppStore } from "../../store/useAppStore";
import DashboardSidebarDividerItem from "./DashboardSidebarDividerItem";
import DashboardSidebarHeaderItem from "./DashboardSidebarHeaderItem";
import DashboardSidebarPageItem from "./DashboardSidebarPageItem";

export interface DashboardSidebarProps {
  selectedTable?: string;
  tableNames?: string[];
}

export default function DashboardSidebar({
  selectedTable,
  tableNames = [],
}: DashboardSidebarProps) {
  const libraryNavOpen = useAppStore((s) => s.libraryNavOpen);
  const setLibraryNavOpen = useAppStore((s) => s.setLibraryNavOpen);

  const { pathname } = useLocation();

  const [expandedItemIds, setExpandedItemIds] = React.useState<string[]>([]);

  const handlePageItemClick = React.useCallback(
    (itemId: string, hasNestedNavigation: boolean) => {
      if (hasNestedNavigation) {
        setExpandedItemIds((previousValue) =>
          previousValue.includes(itemId)
            ? previousValue.filter(
                (previousValueItemId) => previousValueItemId !== itemId,
              )
            : [...previousValue, itemId],
        );
      } else {
        setLibraryNavOpen(false);
      }
    },
    [setLibraryNavOpen],
  );

  const getDrawerContent = React.useCallback(
    () => (
      <Box
        component="nav"
        aria-label="Library navigation"
        sx={{
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
          overflowX: "hidden",
        }}
      >
        <List
          dense
          sx={{
            padding: 0.5,
            mb: 4,
          }}
        >
          <DashboardSidebarHeaderItem>Main items</DashboardSidebarHeaderItem>
          {tableNames.map((tableName) => (
            <DashboardSidebarPageItem
              key={tableName}
              id={`table-${tableName}`}
              title={tableName}
              icon={<PersonIcon />}
              href={`/library?table=${encodeURIComponent(tableName)}`}
              selected={selectedTable === tableName}
            />
          ))}
          <DashboardSidebarDividerItem />
          <DashboardSidebarHeaderItem>Example items</DashboardSidebarHeaderItem>
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
                  pl: 1,
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
    ),
    [expandedItemIds, pathname, selectedTable, tableNames],
  );

  const sidebarContextValue = React.useMemo(() => {
    return {
      onPageItemClick: handlePageItemClick,
      mini: false,
      fullyExpanded: true,
      fullyCollapsed: false,
      hasDrawerTransitions: false,
    };
  }, [handlePageItemClick]);

  return (
    <DashboardSidebarContext.Provider value={sidebarContextValue}>
      <Drawer
        anchor="top"
        variant="temporary"
        open={libraryNavOpen}
        onClose={() => setLibraryNavOpen(false)}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
          disableScrollLock: true,
        }}
        sx={{
          displayPrint: "none",
          width: "100%",
          overflowX: "hidden",
          "& .MuiDrawer-paper": {
            position: "absolute",
            width: "100%",
            boxSizing: "border-box",
            backgroundImage: "none",
            overflowX: "hidden",
          },
        }}
      >
        {getDrawerContent()}
      </Drawer>
    </DashboardSidebarContext.Provider>
  );
}
