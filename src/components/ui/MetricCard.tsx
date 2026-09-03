import { Card, CardContent, Stack, Typography } from "@mui/material";

type MetricCardProps = {
  label: string;
  value: string | number;
  accent?: "primary" | "success" | "warning" | "error";
};

export function MetricCard({
  label,
  value,
  accent = "primary",
}: MetricCardProps) {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, height: "100%" }}>
      <CardContent>
        <Stack spacing={1}>
          <Typography
            variant="h4"
            sx={{ fontWeight: 700, color: `${accent}.main` }}
          >
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
