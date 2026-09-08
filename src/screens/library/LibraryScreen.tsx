import { BookRounded } from "@mui/icons-material";
import { Outlet } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import DashboardLayout from "./DashboardLayout";

export function LibraryScreen() {
  return (
    <>
      <PageHeader
        icon={<BookRounded />}
        title="Study library"
        description="Browse your collections and keep your learning routine consistent."
      />
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </>
  );
}
