import { useAppStore } from "../../store/useAppStore";
import { Screen } from "../../types";
import { IconButton } from "../iconButton";
import { AnalyticsIcon, ContentIcon, HomeIcon, SettingsIcon } from "../Icons";
import s from "./NavBar.module.css";

export function NavBar() {
  const screen = useAppStore((state) => state.screen);
  const setScreen = useAppStore((state) => state.setScreen);

  const handleClick = (screen: Screen) => {
    setScreen(screen);
  };

  return (
    <div className={s.headerActions}>
      <IconButton
        active={screen === "home"}
        icon={<HomeIcon />}
        onClick={() => handleClick("home")}
      />
      <IconButton
        active={screen === "cardSet"}
        icon={<ContentIcon />}
        onClick={() => handleClick("cardSet")}
      />
      <IconButton
        active={screen === "analytics"}
        icon={<AnalyticsIcon />}
        onClick={() => handleClick("analytics")}
      />
      <IconButton
        active={screen === "settings"}
        icon={<SettingsIcon />}
        onClick={() => handleClick("settings")}
      />
    </div>
  );
}
