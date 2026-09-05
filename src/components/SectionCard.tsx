import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import type { ReactNode } from "react";

type SectionCardProps = {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  sx?: object;
};

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  sx,
}: SectionCardProps) {
  return (
    <Card elevation={0} sx={{ borderRadius: 4, ...sx }}>
      {(title || subtitle || action) && (
        <>
          <CardContent sx={{ p: { xs: 2, md: 3 }, pb: 1.5 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              spacing={2}
            >
              <Box>
                {title && (
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography variant="body2" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
              </Box>
              {action}
            </Stack>
          </CardContent>
          <Divider />
        </>
      )}
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>{children}</CardContent>
    </Card>
  );
}
