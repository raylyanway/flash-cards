import { ChangeEvent, useRef, useState } from "react";
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
} from "../../cardData";
import { useAppStore } from "../../store/useAppStore";
import { downloadCsv } from "../../utils/downloadCsv";
import { ContentIcon } from "../Icons";
import { Button } from "../button";
import s from "./ContentScreen.module.css";

function ExportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 15v3a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-3" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21V10m0 0 4 4m-4-4-4 4M5 9V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16m-10 4v6m4-6v6M9 7l1-3h4l1 3m-9 0 1 13h10l1-13" />
    </svg>
  );
}

export function ContentScreen() {
  const importContentInputRef = useRef<HTMLInputElement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  const selectedLabel =
    contentOptions.find((option) => option.key === currentSet)?.label ??
    currentSet;

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
      setIsDeleting(true);
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
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSetChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSet = event.target.value;
    setCurrentSet(nextSet);
    await setSettingsToDB({ currentSet: nextSet, theme });
    await loadSetData(nextSet);
  };

  return (
    <section className={`screen active ${s.contentScreen}`}>
      <div className={s.pageHeading}>
        <div className={s.headingIcon}>
          <ContentIcon />
        </div>
        <div>
          <p className={s.eyebrow}>Content library</p>
          <h1>Manage your learning sets</h1>
          <p>Choose a collection, back it up, or bring in something new.</p>
        </div>
      </div>

      <div className={`card ${s.selectorCard}`}>
        <div className={s.selectorCopy}>
          <span className={s.fieldLabel}>Active collection</span>
          <strong>{selectedLabel}</strong>
          <span>
            {isDefaultSet ? "Built-in collection" : "Your imported collection"}
          </span>
        </div>
        <label className={s.selectWrap}>
          <span className={s.srOnly}>Select content collection</span>
          <select value={currentSet} onChange={handleSetChange}>
            {contentOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={s.actionGrid}>
        <article className={s.actionCard}>
          <div className={`${s.actionIcon} ${s.exportIcon}`}>
            <ExportIcon />
          </div>
          <div className={s.actionContent}>
            <h2>Export a backup</h2>
            <p>Download this collection as a CSV file to keep it safe.</p>
          </div>
          <Button
            icon={<ExportIcon />}
            iconPosition="end"
            onClick={exportContent}
          >
            Export CSV
          </Button>
        </article>

        <article className={s.actionCard}>
          <div className={`${s.actionIcon} ${s.importIcon}`}>
            <ImportIcon />
          </div>
          <div className={s.actionContent}>
            <h2>Import a collection</h2>
            <p>Add a CSV collection and continue learning from any device.</p>
          </div>
          <Button
            icon={<ImportIcon />}
            iconPosition="end"
            onClick={() => importContentInputRef.current?.click()}
          >
            Choose CSV
          </Button>
        </article>
      </div>

      <div className={s.dangerZone}>
        <div>
          <span className={s.dangerLabel}>Danger zone</span>
          <h2>Delete this collection</h2>
          <p>Deletes the collection and all of its saved learning progress.</p>
        </div>
        <Button
          variant="danger"
          disabled={isDefaultSet}
          loading={isDeleting}
          icon={<DeleteIcon />}
          onClick={handleDeleteContent}
        >
          Delete collection
        </Button>
      </div>

      <input
        ref={importContentInputRef}
        type="file"
        hidden
        accept=".csv"
        onChange={handleImportContent}
      />
    </section>
  );
}
