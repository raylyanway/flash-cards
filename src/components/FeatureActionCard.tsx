import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

type FeatureActionCardProps = {
  icon: ReactNode;
  /** Palette color used for the icon badge. */
  accent?: "primary" | "secondary";
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  /** Slot for anything that needs to render alongside the button, e.g. a hidden file input. */
  extra?: ReactNode;
};

export function FeatureActionCard({
  icon,
  accent = "primary",
  title,
  description,
  actionLabel,
  onAction,
  extra,
}: FeatureActionCardProps) {
  return (
    <Card elevation={0} sx={{ borderRadius: 2, height: "100%" }}>
      <CardContent
        sx={{
          p: { xs: 2, md: 3 },
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Stack spacing={2} sx={{ flex: 1 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              bgcolor: `${accent}.main`,
              color:
                accent === "primary" ? "primary.contrastText" : "common.white",
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={icon}
            onClick={onAction}
            sx={{ mt: "auto" }}
          >
            {actionLabel}
          </Button>
          {extra}
        </Stack>
      </CardContent>
    </Card>
  );
}
