type AppHeaderProps = {
  onOpenSettings: () => void;
};

export function AppHeader({ onOpenSettings }: AppHeaderProps) {
  return (
    <header>
      <h1>🎓 English Trainer</h1>
      <div className="header-actions">
        <button className="secondary" onClick={onOpenSettings}>
          ⚙️ Settings
        </button>
      </div>
    </header>
  );
}
