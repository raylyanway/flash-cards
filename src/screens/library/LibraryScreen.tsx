import { BookRounded } from "@mui/icons-material";
import * as React from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { getIndexedDbTableNames } from "../../db";
import DashboardLayout from "./DashboardLayout";

export function LibraryScreen() {
  const [searchParams] = useSearchParams();
  const tableNames = React.useMemo(getIndexedDbTableNames, []);
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
        <Outlet />
      </DashboardLayout>
    </>
  );
}
