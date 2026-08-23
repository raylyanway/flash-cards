import { Button } from "../button";
import { Card } from "../card";
import { HomeIcon } from "../Icons";
import { PageHeader } from "../pageHeader";
import { Typography } from "../typography";
import s from "./LibraryScreen.module.css";

export function LibraryScreen() {
  return (
    <div className={s.libraryScreen}>
      <Typography variant="body">Typography Body</Typography>
      <Typography variant="bodyStrong">Typography Body Strong</Typography>
      <Typography variant="caption">Typography Caption</Typography>
      <Typography variant="label">Typography Label</Typography>
      <Typography variant="nav">Typography Nav</Typography>
      <Typography variant="subtitle">Typography Subtitle</Typography>
      <Typography variant="title">Typography Title</Typography>
      <Button>Start reviewing</Button>
      <PageHeader
        icon={<HomeIcon />}
        eyebrow="Study overview"
        title="Keep your streak alive"
        description="Review what’s due, track your progress, and jump straight back in."
      />
      <Card></Card>
    </div>
  );
}
