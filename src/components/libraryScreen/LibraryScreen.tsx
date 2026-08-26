import { Button } from "../button";
import { Card } from "../card";
import { HomeIcon } from "../Icons";
import { PageHeader } from "../pageHeader";
import { Caption, Label, Subtitle, Title } from "../typography";
import s from "./LibraryScreen.module.css";

export function LibraryScreen() {
  return (
    <div className={s.libraryScreen}>
      <Title>Typography Title</Title>
      <Subtitle>Typography Subtitle</Subtitle>
      <span>
        Text with <strong>strong</strong> and <em>emphasized</em> elements.
      </span>
      <small>Small text</small>
      <strong>
        <small>Small bold text</small>
      </strong>
      <Caption>Typography Caption</Caption>
      <small>
        <Caption>Typography small Caption</Caption>
      </small>
      <Label>Typography Label</Label>
      <small>
        <Label>Typography small Label</Label>
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
