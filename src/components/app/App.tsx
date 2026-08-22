import { NavBar } from "../navBar";
import { ScreenSwitcher } from "../ScreenSwitcher";
import s from "./App.module.css";

export function App() {
  return (
    <div className={s.app}>
      <NavBar />
      <div className={s.appContent}>
        <ScreenSwitcher />
      </div>
    </div>
  );
}
