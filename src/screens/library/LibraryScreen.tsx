import { BookRounded } from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import DashboardLayout from "./DashboardLayout";
import { LibraryList } from "./LibraryList";

const CONTENT_TABLES = ["content"];

export function LibraryScreen() {
  const [searchParams] = useSearchParams();
  const tableNames = CONTENT_TABLES;
  const selectedTable =
    tableNames.find((tableName) => tableName === searchParams.get("table")) ??
    tableNames[0] ??
    "";

  return (
    <>
      <PageHeader
        icon={<BookRounded />}
        title="Study library"
        description="Browse your collections and keep your learning routine consistent."
      />
      <DashboardLayout selectedTable={selectedTable} tableNames={tableNames}>
        <LibraryList />
      </DashboardLayout>
    </>
  );
}
