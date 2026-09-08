import { BookRounded } from "@mui/icons-material";
import { createHashRouter, RouterProvider } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import EmployeeCreate from "../components/EmployeeCreate";
import EmployeeEdit from "../components/EmployeeEdit";
import EmployeeList from "../components/EmployeeList";
import EmployeeShow from "../components/EmployeeShow";
import { PageHeader } from "../components/PageHeader";

const router = createHashRouter([
  {
    Component: DashboardLayout,
    children: [
      {
        path: "/employees",
        Component: EmployeeList,
      },
      {
        path: "/employees/:employeeId",
        Component: EmployeeShow,
      },
      {
        path: "/employees/new",
        Component: EmployeeCreate,
      },
      {
        path: "/employees/:employeeId/edit",
        Component: EmployeeEdit,
      },
      // Fallback route for the example routes in dashboard sidebar items
      {
        path: "*",
        Component: EmployeeList,
      },
    ],
  },
]);

export function LibraryScreen() {
  return (
    <>
      <PageHeader
        icon={<BookRounded />}
        title="Study library"
        description="Browse your collections and keep your learning routine consistent."
      />

      <RouterProvider router={router} />
    </>
  );
}
