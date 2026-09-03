import { BookRounded } from "@mui/icons-material";
import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { PageHeader } from "../ui/PageHeader";

const libraryItems = [
  {
    title: "Body parts",
    description: "Vocabulary for anatomy and daily communication.",
  },
  {
    title: "Food",
    description: "Everyday words for meals, ingredients, and shopping.",
  },
  {
    title: "Sentences",
    description: "Helpful phrases and sentence patterns for fluent recall.",
  },
];

export function LibraryScreen() {
  return (
    <>
      <PageHeader
        icon={<BookRounded />}
        title="Study library"
        description="Browse your collections and keep your learning routine consistent."
      />

      <Grid container spacing={3}>
        {libraryItems.map((item) => (
          <Grid size={{ xs: 12, md: 4 }} key={item.title}>
            <Card elevation={0} sx={{ borderRadius: 4, height: "100%" }}>
              <CardContent sx={{ p: { xs: 2, md: 3 }, height: "100%" }}>
                <Stack spacing={1.5} sx={{ height: "100%" }}>
                  <Typography variant="overline" color="text.secondary">
                    Collection
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
