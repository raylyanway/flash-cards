import type { ThemePreference } from "../types";

type SettingsScreenProps = {
  theme: ThemePreference;
  onBackHome: () => void;
  onDeleteDatabase: () => void;
  onThemeChange: (theme: ThemePreference) => void;
};

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];

function getThemeDescription(option: ThemePreference) {
  if (option === "system") return "Follow your device theme preference.";
  if (option === "light") return "Soft pastel light mode with strong contrast.";
  return "High-contrast dark mode for low vision support.";
}

export function SettingsScreen({
  theme,
  onBackHome,
  onDeleteDatabase,
  onThemeChange,
}: SettingsScreenProps) {
  return (
    <section className="screen active">
      <div className="top-bar">
        <button onClick={onBackHome}>← Home</button>
        <h2>Settings</h2>
      </div>

      <div className="card">
        <h3>App Theme</h3>
        <p className="help-text">
          Choose a high-contrast theme or let the app follow your system
          preference.
        </p>

        <div className="theme-options">
          {THEME_OPTIONS.map((option) => (
            <label className="theme-option" key={option}>
              <input
                type="radio"
                name="themeOption"
                value={option}
                checked={theme === option}
                onChange={() => onThemeChange(option)}
              />
              <div>
                <strong>{option[0].toUpperCase() + option.slice(1)}</strong>
                <div>{getThemeDescription(option)}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="setup-section">
          <h3>Database</h3>
          <p className="help-text">
            Delete the saved app database and reset indexed data. This does not
            remove your cardset files.
          </p>
          <div className="button-group">
            <button className="danger" onClick={onDeleteDatabase}>
              Delete Database
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
