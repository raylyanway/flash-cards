import { useAppStore } from "../store/useAppStore";

type AppHeaderProps = {
  onOpenSettings: () => void;
};

export function AppHeader({ onOpenSettings }: AppHeaderProps) {
  const currentSet = useAppStore((state) => state.currentSet);

  return (
    <header>
      <div className="current-set">
        <span className="set-label">Current set:</span>
        <strong>{currentSet}</strong>
      </div>
      <div className="header-actions">
        <button className="secondary" onClick={onOpenSettings}>
          ⚙️ Settings
        </button>
      </div>
    </header>
  );
}
