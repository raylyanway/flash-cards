import { BookRounded } from "@mui/icons-material";
import { Outlet } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";

export function LibraryScreen() {
  return (
    <>
      <PageHeader
        icon={<BookRounded />}
        title="Study library"
        description="Browse your collections and keep your learning routine consistent."
      />

      <Outlet />
    </>
  );
}
