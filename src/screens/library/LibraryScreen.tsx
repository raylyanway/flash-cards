import { BookRounded } from "@mui/icons-material";
import { PageHeader } from "../../components/PageHeader";
import { LibraryList } from "./LibraryList";

export function LibraryScreen() {
  return (
    <>
      <PageHeader
        icon={<BookRounded />}
        title="Study library"
        description="Browse every card, review its progress, and import or export your library."
      />
      <LibraryList />
    </>
  );
}
