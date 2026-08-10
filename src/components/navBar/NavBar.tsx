import clsx from "clsx";
import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Screen } from "../../types";
import s from "./NavBar.module.css";

const NAV_ITEMS = [
  { screen: "home" as const, label: "Home" },
  { screen: "content" as const, label: "Content" },
  { screen: "analytics" as const, label: "Analytics" },
  { screen: "settings" as const, label: "Settings" },
];

export function NavBar() {
  const screen = useAppStore((state) => state.screen);
  const setScreen = useAppStore((state) => state.setScreen);
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = (nextScreen: Screen) => {
    setScreen(nextScreen);
    setIsOpen(false);
  };

  return (
    <nav className={s.navWrap} aria-label="Primary navigation">
      <div className={s.navContent}>
        <div className={s.brand} aria-hidden="true">
          Flash Cards
        </div>

        <button
          className={clsx(s.menuButton, isOpen && s.open)}
          type="button"
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className={s.menuIcon} />
        </button>

        <ul className={clsx(s.navList, isOpen && s.open)}>
          {NAV_ITEMS.map((item) => (
            <li key={item.screen}>
              <button
                className={clsx(screen === item.screen && s.active)}
                type="button"
                onClick={() => handleClick(item.screen)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
