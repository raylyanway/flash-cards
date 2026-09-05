import { Card, CardContent, Stack, Typography, alpha } from "@mui/material";

type MetricAccent = "primary" | "secondary" | "success" | "warning" | "error";

type MetricCardProps = {
  label: string;
  value: string | number;
  accent?: MetricAccent;
  /** "md" (default) is the prominent standalone tile used on dashboards.
   *  "sm" is a compact, tinted tile for tight inline stat rows. */
  size?: "sm" | "md";
};

export function MetricCard({
  label,
  value,
  accent = "primary",
  size = "md",
}: MetricCardProps) {
  const compact = size === "sm";

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: compact ? 3 : 4,
        height: "100%",
        bgcolor: compact
          ? (theme) => alpha(theme.palette[accent].main, 0.08)
          : undefined,
      }}
    >
      <CardContent sx={{ py: compact ? 1.5 : 3, textAlign: compact ? "left" : "center" }}>
        <Stack spacing={compact ? 0 : 1}>
          <Typography
            variant={compact ? "h6" : "h4"}
            sx={{ fontWeight: 700, color: `${accent}.main` }}
          >
            {value}
          </Typography>
          <Typography
            variant={compact ? "caption" : "body2"}
            color="text.secondary"
          >
            {label}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
