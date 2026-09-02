import { Button } from "../button";
import { Card } from "../card";
import { HomeIcon } from "../Icons";
import { PageHeader } from "../pageHeader";
import s from "./LibraryScreen.module.css";

export function LibraryScreen() {
  return (
    <div className={s.libraryScreen}>
      <h1>Typography Title</h1>
      <h2 className="muted">Typography Subtitle</h2>
      <span>Text with elements.</span>
      <span className="label">Text with elements.</span>
      <small>Small text</small>
      <small>
        <small className="label">Small text</small>
      </small>
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
