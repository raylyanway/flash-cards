import { Box, Typography } from "@mui/material";
import type { ReactNode } from "react";

type PageHeaderProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

export function PageHeader({ icon, title, description }: PageHeaderProps) {
  return (
    <Box
      component="header"
      sx={{
        display: { xs: "none", md: "flex" },
        alignItems: "center",
        gap: 2,
        mb: 4,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 1,
          display: "grid",
          placeItems: "center",
          bgcolor: "action.selected",
          color: "primary.main",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="h1"
          variant="h5"
          sx={{ fontWeight: 700, letterSpacing: 0, lineHeight: 1.2 }}
        >
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}
