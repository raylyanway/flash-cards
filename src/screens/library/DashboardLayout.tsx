import Box from "@mui/material/Box";
import * as React from "react";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardLayout({
  children,
  selectedTable,
  tableNames,
}: {
  children: React.ReactNode;
  selectedTable: string;
  tableNames: string[];
}) {
  const layoutRef = React.useRef<HTMLDivElement>(null);

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
        container={layoutRef?.current ?? undefined}
        selectedTable={selectedTable}
        tableNames={tableNames}
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
          {children}
        </Box>
      </Box>
    </Box>
  );
}
