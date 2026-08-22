import { NavBar } from "../navBar";
import { ScreenSwitcher } from "../ScreenSwitcher";
import s from "./AppContent.module.css";

export function App() {
  return (
    <>
      <NavBar />
      <div className={s.appContent}>
        <ScreenSwitcher />
      </div>
    </>
  );
}
