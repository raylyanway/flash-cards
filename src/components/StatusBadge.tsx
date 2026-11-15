import Chip from "@mui/material/Chip";
import { getContrastRatio } from "@mui/material/styles";

type StatusBadgeColor = "default" | "primary" | "warning" | "success" | "error";

export function getStageBadgeColor(stage: number): StatusBadgeColor {
  if (stage === 1) return "warning";
  if (stage === 2) return "primary";
  if (stage >= 3) return "success";
  return "default";
}

export function StatusBadge({
  label,
  color,
  ariaLabel,
}: {
  label: string;
  color: StatusBadgeColor;
  ariaLabel?: string;
}) {
  return (
    <Chip
      size="small"
      label={label}
      aria-label={ariaLabel}
      sx={(theme) => {
        const background =
          color === "default"
            ? theme.palette.grey[600]
            : theme.palette[color].main;
        return {
          bgcolor: background,
          color:
            getContrastRatio(background, "#000") >=
            getContrastRatio(background, "#fff")
              ? "#000"
              : "#fff",
          border: 0,
          borderRadius: "4px",
          fontWeight: 700,
        };
      }}
    />
  );
}
