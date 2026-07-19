import { ChangeEvent, useRef } from "react";
import {
  createCsvFromCards,
  DEFAULT_CONTENT,
  deleteContent,
  getAllCardsForSet,
  getContentBaseName,
  getContentDisplayName,
  getContentOptions,
  getDisplayNameForSet,
  getUniqueContentNames,
  importContent,
  parseCsvToJson,
  setContentMetadata,
  setSettingsToDB,
} from "../cardData";
import { useAppStore } from "../store/useAppStore";
import { downloadCsv } from "../utils/downloadCsv";

export function ContentScreen() {
  const importContentInputRef = useRef<HTMLInputElement | null>(null);

  const theme = useAppStore((state) => state.theme);

  const contentOptions = useAppStore((state) => state.contentOptions);
  const currentSet = useAppStore((state) => state.currentSet);
  const setContentOptions = useAppStore((state) => state.setContentOptions);
  const setCurrentSet = useAppStore((state) => state.setCurrentSet);
  const loadSetData = useAppStore((state) => state.loadSetData);
  const refreshContentOptions = useAppStore(
    (state) => state.refreshContentOptions,
  );

  const isDefaultSet = DEFAULT_CONTENT.some((item) => item.key === currentSet);

  const exportContent = async () => {
    try {
      const allCards = await getAllCardsForSet(currentSet);
      if (!allCards.length) {
        alert("Nothing to export for this content set.");
        return;
      }
      downloadCsv(
        createCsvFromCards(
          allCards.map((card) => {
            const exportedCard = { ...card };
            delete exportedCard.setName;
            return exportedCard;
          }),
        ),
        `${currentSet}.csv`,
      );
    } catch (error) {
      console.error("exportContent failed:", error);
      alert("Unable to export content. See console for details.");
    }
  };

  const handleImportContent = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Please upload a .csv file only.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (loadEvent) => {
      try {
        const data = parseCsvToJson(String(loadEvent.target?.result || ""));
        const setName = getContentBaseName(file.name);
        if (!setName) {
          throw new Error(
            "Unable to infer content name from the uploaded file name.",
          );
        }

        const existing = await getUniqueContentNames();
        if (existing.includes(setName)) {
          const confirmed = confirm(
            `A content named "${setName}" already exists. Overwrite it?`,
          );
          if (!confirmed) return;
        }

        const displayName = getDisplayNameForSet(setName);
        await importContent(setName, data);
        await setContentMetadata({
          setName,
          displayName,
          importedAt: Date.now(),
        });
        await refreshContentOptions(setName);
        setCurrentSet(setName);
        await setSettingsToDB({ currentSet: setName, theme });
        await loadSetData(setName);
        alert(`Content "${displayName}" imported successfully.`);
      } catch (error) {
        alert(`Failed to import content: ${(error as Error).message}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteContent = async () => {
    if (isDefaultSet) {
      alert("Default content sets cannot be deleted.");
      return;
    }

    const displayName = await getContentDisplayName(currentSet);
    if (
      !confirm(
        `Delete content "${displayName}"? This will remove the content and its progress.`,
      )
    ) {
      return;
    }

    try {
      await deleteContent(currentSet);
      const options = await getContentOptions();
      const nextSet = options[0]?.key || "body-parts";
      setContentOptions(options);
      setCurrentSet(nextSet);
      await setSettingsToDB({ currentSet: nextSet, theme });
      await loadSetData(nextSet);
      alert(`Content "${displayName}" deleted.`);
    } catch (error) {
      console.error("Failed to delete content:", error);
      alert("Unable to delete content. See console for details.");
    }
  };

  const handleSetChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSet = event.target.value;
    setCurrentSet(nextSet);
    await setSettingsToDB({ currentSet: nextSet, theme });
    await loadSetData(nextSet);
  };

  return (
    <section className="screen active">
      <div className="card">
        <select value={currentSet} onChange={handleSetChange}>
          {contentOptions.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="button-group content-actions">
          <button className="secondary" onClick={exportContent}>
            📦 Export Content
          </button>
          <button
            className="secondary"
            onClick={() => importContentInputRef.current?.click()}
          >
            📤 Import Content
          </button>
          <button
            className="danger"
            disabled={isDefaultSet}
            onClick={handleDeleteContent}
          >
            🗑 Delete Content
          </button>
          <input
            ref={importContentInputRef}
            type="file"
            hidden
            accept=".csv"
            onChange={handleImportContent}
          />
        </div>
      </div>
    </section>
  );
}
