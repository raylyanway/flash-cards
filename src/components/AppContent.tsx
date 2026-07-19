import { AppHeader } from "./appHeader";
import { NavBar } from "./navBar";
import { ScreenSwitcher } from "./ScreenSwitcher";

export function AppContent() {
  return (
    <>
      <AppHeader />
      <NavBar />
      <ScreenSwitcher />
    </>
  );
}
