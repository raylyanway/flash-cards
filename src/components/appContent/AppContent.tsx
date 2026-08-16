import { NavBar } from "../navBar";
import { ScreenSwitcher } from "../ScreenSwitcher";
import s from "./AppContent.module.css";

export function AppContent() {
  return (
    <>
      <NavBar />
      <div className={s.appContent}>
        <ScreenSwitcher />
      </div>
    </>
  );
}
