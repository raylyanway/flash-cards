import { useAppStore } from "../../store/useAppStore";
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
        <button className="secondary" onClick={onOpenSettings}>
          ⚙️ Settings
        </button>
      </div>
    </header>
  );
}
