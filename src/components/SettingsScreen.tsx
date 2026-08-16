import {
  deleteAppDatabase,
  setCachedDataVersion,
  setSettingsToDB,
} from "../cardData";
import { useAppStore } from "../store/useAppStore";
import type { ThemePreference } from "../types";

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];

function getThemeDescription(option: ThemePreference) {
  if (option === "system") return "Follow your device theme preference.";
  if (option === "light") return "Soft pastel light mode with strong contrast.";
  return "High-contrast dark mode for low vision support.";
}

export function SettingsScreen() {
  const theme = useAppStore((state) => state.theme);
  const currentSet = useAppStore((state) => state.currentSet);
  const setTheme = useAppStore((state) => state.setTheme);

  const handleDeleteDatabase = async () => {
    const confirmed = confirm(
      "Delete the saved app database? This will remove all stored progress and content data in IndexedDB.",
    );
    if (!confirmed) return;

    try {
      await deleteAppDatabase();
      await setCachedDataVersion(0);
      alert(
        "App database deleted. The app will reload to recreate fresh storage.",
      );
      location.reload();
    } catch (error) {
      console.error("Unable to delete database:", error);
      alert("Could not delete the database. Close other tabs and try again.");
    }
  };

  const handleThemeChange = async (nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    await setSettingsToDB({ currentSet, theme: nextTheme });
  };

  return (
    <section>
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
                onChange={() => handleThemeChange(option)}
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
            remove your content files.
          </p>
          <div className="button-group">
            <button className="danger" onClick={handleDeleteDatabase}>
              Delete Database
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
