import { useAppStore } from "../../store/useAppStore";
import s from "./NavBar.module.css";

export function NavBar() {
  const screen = useAppStore((state) => state.screen);
  const setScreen = useAppStore((state) => state.setScreen);

  return (
    <header className={s.navbar}>
      <div className={s.navbarBrand}>📚 Flash Cards</div>

      <nav className={s.navbarNav}>
        <button
          className={screen === "home" ? s.active : ""}
          onClick={() => setScreen("home")}
        >
          Home
        </button>

        <button
          className={screen === "learn" ? s.active : ""}
          onClick={() => setScreen("learn")}
        >
          Learn
        </button>

        <button
          className={screen === "analytics" ? s.active : ""}
          onClick={() => setScreen("analytics")}
        >
          Analytics
        </button>

        <button
          className={screen === "settings" ? s.active : ""}
          onClick={() => setScreen("settings")}
        >
          Settings
        </button>
      </nav>
    </header>
  );
}
