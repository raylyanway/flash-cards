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
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        mb: { xs: 3, md: 4 },
      }}
    >
      <Box
        sx={{
          width: { xs: 44, sm: 52 },
          height: { xs: 44, sm: 52 },
          borderRadius: "14px 14px 14px 4px",
          display: "grid",
          placeItems: "center",
          bgcolor: "primary.main",
          color: "primary.contrastText",
          flexShrink: 0,
          boxShadow: "4px 4px 0 rgba(239, 131, 84, 0.28)",
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="overline"
          color="primary.main"
          sx={{ letterSpacing: 1.6, fontWeight: 800, lineHeight: 1.4 }}
        >
          Learning dashboard
        </Typography>
        <Typography
          variant="h4"
          sx={{ fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05 }}
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
