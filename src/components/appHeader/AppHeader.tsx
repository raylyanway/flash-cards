import { useAppStore } from "../../store/useAppStore";
import { IconButton } from "../iconButton";
import { SettingsIcon } from "../Icons";
import s from "./AppHeader.module.css";

type AppHeaderProps = {
  onOpenSettings: () => void;
};

export function AppHeader({ onOpenSettings }: AppHeaderProps) {
  const currentSet = useAppStore((state) => state.currentSet);

  return (
    <header>
      <div className={s.currentSet}>
        <span className={s.setLabel}>Current set:</span>
        <strong>{currentSet}</strong>
      </div>
      <div className={s.headerActions}>
        <IconButton
          icon={<SettingsIcon />}
          ariaLabel="Settings"
          onClick={onOpenSettings}
        />
      </div>
    </header>
  );
}
