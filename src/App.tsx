import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_CARDSETS,
  createCsvFromCards,
  createCsvFromProgress,
  deleteAppDatabase,
  deleteCardset,
  getAllCardsForSet,
  getCardsetBaseName,
  getCardsetDisplayName,
  getCardsetOptions,
  getDisplayNameForSet,
  getProgressFromDB,
  getSettingsFromDB,
  getUniqueCardsetNames,
  importCardset,
  initializeCardSet,
  parseCsvToJson,
  setCachedDataVersion,
  setCardsetMetadata,
  setProgressToDB,
  setSettingsToDB,
} from "./cardData";
import {
  createSpeechRecognition,
  speakWord,
  type SpeechRecognitionInstance,
} from "./speech";
import type {
  Card,
  CardsetOption,
  ProgressEntry,
  ProgressMap,
  Screen,
  ThemePreference,
} from "./types";

const DEFAULT_THEME: ThemePreference = "system";
const REVIEW_1_DELAY = 30 * 1000;
const REVIEW_2_DELAY = 60 * 1000;
const MAX_WRONG_ATTEMPTS = 3;

function initializeMissingProgress(cards: Card[], progress: ProgressMap) {
  const next = { ...progress };
  for (const card of cards) {
    if (!next[card.text]) {
      next[card.text] = { stage: 0, nextReview: 0, correctCount: 0 };
    }
  }
  return next;
}

function getStageName(stage: number) {
  switch (stage) {
    case 0:
      return "🆕 New";
    case 1:
      return "🔁 Repeat x1";
    case 2:
      return "🔁 Repeat x2";
    case 3:
      return "✅ Learned";
    default:
      return "Unknown";
  }
}

function getStageClass(stage: number) {
  return (
    ["status-new", "status-review1", "status-review2", "status-learned"][
      stage
    ] || ""
  );
}

function getAnswerText(card: Card) {
  return Array.isArray(card.answers)
    ? card.answers.join(", ")
    : String(card.answers || card.text);
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, "");
}

function downloadCsv(csvText: string, fileName: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [currentSet, setCurrentSet] = useState("body-parts");
  const [theme, setTheme] = useState<ThemePreference>(DEFAULT_THEME);
  const [cardsetOptions, setCardsetOptions] =
    useState<CardsetOption[]>(DEFAULT_CARDSETS);
  const [cards, setCards] = useState<Card[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [listening, setListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("Press Start Listening");
  const [result, setResult] = useState("");
  const [resultClass, setResultClass] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [skipEnabled, setSkipEnabled] = useState(true);
  const [progressSearch, setProgressSearch] = useState("");
  const [setupBackup, setSetupBackup] = useState<ProgressMap | null>(null);
  const [now, setNow] = useState(Date.now());

  const skippedCardsRef = useRef(new Set<string>());
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const importCardsetInputRef = useRef<HTMLInputElement | null>(null);
  const importProgressInputRef = useRef<HTMLInputElement | null>(null);

  const learnedCount = useMemo(
    () => Object.values(progress).filter((item) => item.stage === 3).length,
    [progress],
  );
  const review1Count = useMemo(
    () => Object.values(progress).filter((item) => item.stage === 1).length,
    [progress],
  );
  const review2Count = useMemo(
    () => Object.values(progress).filter((item) => item.stage === 2).length,
    [progress],
  );
  const newCount = useMemo(
    () => Object.values(progress).filter((item) => item.stage === 0).length,
    [progress],
  );
  const completePercent =
    cards.length === 0 ? 0 : Math.round((learnedCount * 100) / cards.length);

  const nextDueTimestamp = useMemo(() => {
    let nextTime: number | null = null;
    for (const card of cards) {
      const cardProgress = progress[card.text];
      if (!cardProgress || cardProgress.stage >= 3) continue;
      if (nextTime === null || cardProgress.nextReview < nextTime) {
        nextTime = cardProgress.nextReview;
      }
    }
    return nextTime;
  }, [cards, progress]);

  const nextReviewLabel = useMemo(() => {
    let nearest: number | null = null;
    for (const item of Object.values(progress)) {
      if (item.stage < 3 && item.nextReview > now) {
        if (nearest === null || item.nextReview < nearest)
          nearest = item.nextReview;
      }
    }
    if (nearest === null) return "Ready now";
    return `${Math.max(0, Math.ceil((nearest - now) / 1000))} sec`;
  }, [now, progress]);

  const saveProgress = useCallback(
    async (nextProgress: ProgressMap) => {
      setProgress(nextProgress);
      await setProgressToDB(currentSet, nextProgress);
    },
    [currentSet],
  );

  const refreshCardsetOptions = useCallback(
    async (preferredSet = currentSet) => {
      const options = await getCardsetOptions();
      setCardsetOptions(options);
      if (
        !options.some((option) => option.key === preferredSet) &&
        options[0]
      ) {
        setCurrentSet(options[0].key);
      }
    },
    [currentSet],
  );

  const loadSetData = useCallback(async (setName: string) => {
    const [storedProgress, loadedCards] = await Promise.all([
      getProgressFromDB(setName),
      initializeCardSet(setName),
    ]);
    const nextProgress = initializeMissingProgress(
      loadedCards,
      storedProgress || {},
    );
    setCards(loadedCards);
    setProgress(nextProgress);
    await setProgressToDB(setName, nextProgress);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const settings = await getSettingsFromDB();
      if (!mounted) return;

      const savedSet = settings.currentSet || "body-parts";
      const savedTheme = settings.theme || DEFAULT_THEME;
      setCurrentSet(savedSet);
      setTheme(savedTheme);
      await refreshCardsetOptions(savedSet);
      await loadSetData(savedSet);
    }

    boot().catch((error) => {
      console.error("Failed to initialize app:", error);
    });

    return () => {
      mounted = false;
    };
  }, [loadSetData, refreshCardsetOptions]);

  useEffect(() => {
    document.body.classList.remove("theme-system", "theme-light", "theme-dark");
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const recognition = createSpeechRecognition();
    recognitionRef.current = recognition;
    if (!recognition) {
      setRecognizedText("Speech recognition not supported");
      return;
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setRecognizedText(`You said: ${transcript}`);
      checkAnswerRef.current(transcript);
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") return;
      console.log("Speech error:", event.error);
      setRecognizedText(`Error: ${event.error}`);
    };
    recognition.onend = () => {
      if (listeningRef.current) {
        try {
          recognition.start();
        } catch {
          // Browser may throw if recognition is already running.
        }
      }
    };

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // Ignore shutdown errors.
      }
    };
  }, []);

  const progressRef = useRef(progress);
  const cardsRef = useRef(cards);
  const currentCardRef = useRef(currentCard);
  const listeningRef = useRef(listening);

  useEffect(() => {
    progressRef.current = progress;
    cardsRef.current = cards;
    currentCardRef.current = currentCard;
    listeningRef.current = listening;
  }, [cards, currentCard, listening, progress]);

  const attemptsText = useCallback(
    (attempts = wrongAttempts) => {
      const attemptsLeft = Math.max(0, MAX_WRONG_ATTEMPTS - attempts);
      return attemptsLeft > 0
        ? `${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left`
        : "No attempts left";
    },
    [wrongAttempts],
  );

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    setListening(false);
    try {
      recognition?.stop();
    } catch {
      // Ignore speech API stop races.
    }
  }, []);

  const selectNextCard = useCallback(() => {
    const dueCards = cardsRef.current.filter((card) => {
      if (skippedCardsRef.current.has(card.text)) return false;
      const cardProgress = progressRef.current[card.text];
      return Boolean(
        cardProgress &&
        cardProgress.stage < 3 &&
        cardProgress.nextReview <= Date.now(),
      );
    });

    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (dueCards.length === 0) {
      stopListening();
      setCurrentCard(null);
      setResult("");
      setSkipEnabled(false);
      return;
    }

    dueCards.sort(
      (a, b) =>
        progressRef.current[a.text].stage - progressRef.current[b.text].stage,
    );
    const nextCard = dueCards[0];
    setCurrentCard(nextCard);
    setWrongAttempts(0);
    setResult("");
    setResultClass("");
    setSkipEnabled(true);
    setRecognizedText(`Press Start Listening - ${attemptsText(0)}`);
    speakWord(nextCard.text);
  }, [attemptsText, stopListening]);

  useEffect(() => {
    if (screen !== "learn" || currentCard) return;
    if (nextDueTimestamp !== null && nextDueTimestamp <= now) {
      selectNextCard();
    }
  }, [currentCard, nextDueTimestamp, now, screen, selectNextCard]);

  const scheduleNextCard = useCallback(
    (delay: number) => {
      if (transitionTimerRef.current)
        window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = window.setTimeout(selectNextCard, delay);
    },
    [selectNextCard],
  );

  const updateProgressForCard = useCallback(
    async (card: Card, updater: (entry: ProgressEntry) => ProgressEntry) => {
      const nextProgress = {
        ...progressRef.current,
        [card.text]: updater({ ...progressRef.current[card.text] }),
      };
      await saveProgress(nextProgress);
      return nextProgress[card.text];
    },
    [saveProgress],
  );

  const markCorrect = useCallback(
    async (card: Card) => {
      await updateProgressForCard(card, (entry) => {
        const nextEntry = { ...entry, correctCount: entry.correctCount + 1 };
        if (nextEntry.stage === 0) {
          nextEntry.stage = 1;
          nextEntry.nextReview = Date.now() + REVIEW_1_DELAY;
        } else if (nextEntry.stage === 1) {
          nextEntry.stage = 2;
          nextEntry.nextReview = Date.now() + REVIEW_2_DELAY;
        } else if (nextEntry.stage === 2) {
          nextEntry.stage = 3;
          nextEntry.nextReview = 0;
        }
        return nextEntry;
      });
      setResult("✅ Correct");
      setResultClass("correct");
      scheduleNextCard(1500);
    },
    [scheduleNextCard, updateProgressForCard],
  );

  const markWrong = useCallback(
    async (card: Card) => {
      const nextAttempts = wrongAttempts + 1;
      setWrongAttempts(nextAttempts);
      await updateProgressForCard(card, (entry) => ({
        ...entry,
        stage: entry.stage > 0 ? entry.stage - 1 : entry.stage,
        nextReview: Date.now(),
      }));

      if (nextAttempts >= MAX_WRONG_ATTEMPTS) {
        skippedCardsRef.current.add(card.text);
        setResult(`❌ Wrong - correct answer: ${getAnswerText(card)}`);
        setResultClass("wrong");
        setRecognizedText("Moving to another card...");
        setSkipEnabled(false);
        scheduleNextCard(5000);
        return;
      }

      setResult("❌ Wrong");
      setResultClass("wrong");
      setRecognizedText(
        listeningRef.current
          ? `🎤 Listening... (${attemptsText(nextAttempts)})`
          : `Press Start Listening - ${attemptsText(nextAttempts)}`,
      );
    },
    [attemptsText, scheduleNextCard, updateProgressForCard, wrongAttempts],
  );

  const checkAnswerRef = useRef<(text: string) => void>(() => undefined);
  checkAnswerRef.current = (text: string) => {
    const card = currentCardRef.current;
    if (!card) return;

    const answers = (
      Array.isArray(card.answers) && card.answers.length
        ? card.answers
        : [card.text]
    ).map(normalize);
    if (answers.includes(normalize(text))) {
      markCorrect(card);
    } else {
      markWrong(card);
    }
  };

  const startLearningSession = () => {
    setScreen("learn");
    setResult("");
    setRecognizedText("");
    skippedCardsRef.current.clear();
    window.setTimeout(selectNextCard, 0);
  };

  const handleSetChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const nextSet = event.target.value;
    setCurrentSet(nextSet);
    await setSettingsToDB({ currentSet: nextSet, theme });
    await loadSetData(nextSet);
  };

  const handleThemeChange = async (nextTheme: ThemePreference) => {
    setTheme(nextTheme);
    await setSettingsToDB({ currentSet, theme: nextTheme });
  };

  const handleDeleteDatabase = async () => {
    const confirmed = confirm(
      "Delete the saved app database? This will remove all stored progress and cardset data in IndexedDB.",
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

  const exportProgress = () => {
    if (!cards.length) {
      alert("Nothing to export for this cardset.");
      return;
    }
    downloadCsv(
      createCsvFromProgress(progress, cards),
      `${currentSet}-progress-${new Date().toISOString().split("T")[0]}.csv`,
    );
  };

  const handleImportProgress = (event: ChangeEvent<HTMLInputElement>) => {
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
        const importedProgress: ProgressMap = {};
        for (const row of data) {
          const text = String(row.text || "").trim();
          if (!text) continue;
          importedProgress[text] = {
            stage: Number(row.stage) || 0,
            nextReview: Number(row.nextReview) || 0,
            correctCount: Number(row.correctCount) || 0,
          };
        }

        if (Object.keys(importedProgress).length === 0) {
          throw new Error("No valid progress rows found.");
        }

        const confirmed = confirm(
          `Import progress for "${currentSet}"? This will overwrite progress for matching cards.`,
        );
        if (!confirmed) return;

        const nextProgress = initializeMissingProgress(cards, {
          ...progress,
          ...importedProgress,
        });
        await saveProgress(nextProgress);
        alert("Progress imported successfully!");
      } catch (error) {
        alert(`Failed to import progress: ${(error as Error).message}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const exportCardset = async () => {
    try {
      const allCards = await getAllCardsForSet(currentSet);
      if (!allCards.length) {
        alert("Nothing to export for this cardset.");
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
      console.error("exportCardset failed:", error);
      alert("Unable to export cardset. See console for details.");
    }
  };

  const handleImportCardset = (event: ChangeEvent<HTMLInputElement>) => {
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
        const setName = getCardsetBaseName(file.name);
        if (!setName)
          throw new Error(
            "Unable to infer cardset name from the uploaded file name.",
          );

        const existing = await getUniqueCardsetNames();
        if (existing.includes(setName)) {
          const confirmed = confirm(
            `A cardset named "${setName}" already exists. Overwrite it?`,
          );
          if (!confirmed) return;
        }

        const displayName = getDisplayNameForSet(setName);
        await importCardset(setName, data);
        await setCardsetMetadata({
          setName,
          displayName,
          importedAt: Date.now(),
        });
        await refreshCardsetOptions(setName);
        setCurrentSet(setName);
        await setSettingsToDB({ currentSet: setName, theme });
        await loadSetData(setName);
        alert(`Cardset "${displayName}" imported successfully.`);
      } catch (error) {
        alert(`Failed to import cardset: ${(error as Error).message}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleDeleteCardset = async () => {
    if (DEFAULT_CARDSETS.some((item) => item.key === currentSet)) {
      alert("Default cardsets cannot be deleted.");
      return;
    }

    const displayName = await getCardsetDisplayName(currentSet);
    if (
      !confirm(
        `Delete cardset "${displayName}"? This will remove the cardset and its progress.`,
      )
    ) {
      return;
    }

    try {
      await deleteCardset(currentSet);
      const options = await getCardsetOptions();
      const nextSet = options[0]?.key || "body-parts";
      setCardsetOptions(options);
      setCurrentSet(nextSet);
      await setSettingsToDB({ currentSet: nextSet, theme });
      await loadSetData(nextSet);
      alert(`Cardset "${displayName}" deleted.`);
    } catch (error) {
      console.error("Failed to delete cardset:", error);
      alert("Unable to delete cardset. See console for details.");
    }
  };

  const resetProgress = async () => {
    if (!confirm(`Reset progress for "${currentSet}"?`)) return;
    const nextProgress = initializeMissingProgress(cards, {});
    await saveProgress(nextProgress);
  };

  const setAllStages = (stage: number) => {
    const nextProgress: ProgressMap = {};
    for (const card of cards) {
      nextProgress[card.text] = {
        stage,
        nextReview: 0,
        correctCount: stage === 3 ? 3 : 0,
      };
    }
    setProgress(nextProgress);
  };

  const setCardStage = (card: Card, stage: number) => {
    setProgress({
      ...progress,
      [card.text]: {
        ...progress[card.text],
        stage,
        nextReview: 0,
        correctCount:
          stage === 3
            ? Math.max(progress[card.text]?.correctCount || 0, 3)
            : progress[card.text]?.correctCount || 0,
      },
    });
  };

  const openProgressSetup = () => {
    setSetupBackup(progress);
    setProgressSearch("");
    setScreen("progressSetup");
  };

  const closeProgressSetup = () => {
    if (setupBackup) {
      setProgress(setupBackup);
      setSetupBackup(null);
    }
    setScreen("analytics");
  };

  const doneProgressSetup = async () => {
    await setProgressToDB(currentSet, progress);
    setSetupBackup(null);
    setScreen("analytics");
  };

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setListening(true);
    setRecognizedText(`🎤 Listening... (${attemptsText()})`);
    try {
      recognition.start();
    } catch {
      // Ignore duplicate start calls.
    }
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
      setRecognizedText(`Press Start Listening - ${attemptsText()}`);
    } else {
      startListening();
    }
  };

  const skipCurrentCard = async () => {
    if (!currentCard) return;
    await updateProgressForCard(currentCard, (entry) => ({
      ...entry,
      stage: entry.stage > 0 ? entry.stage - 1 : entry.stage,
      nextReview: Date.now(),
    }));
    skippedCardsRef.current.add(currentCard.text);
    setResult(`⏭ Skipped - correct answer: ${getAnswerText(currentCard)}`);
    setResultClass("skipped");
    setSkipEnabled(false);
    setRecognizedText("Moving to another card...");
    scheduleNextCard(5000);
  };

  const filteredSetupCards = cards.filter((card) =>
    card.text.toLowerCase().includes(progressSearch.toLowerCase()),
  );
  const sortedAnalyticsCards = [...cards].sort((a, b) =>
    a.text.localeCompare(b.text),
  );
  const isDefaultSet = DEFAULT_CARDSETS.some((item) => item.key === currentSet);
  const waitingMessage =
    nextDueTimestamp === null
      ? "All cards learned 🎉"
      : `⏳ Next review in ${Math.max(0, Math.ceil((nextDueTimestamp - now) / 1000))} sec`;

  return (
    <>
      <header>
        <h1>🎓 English Trainer</h1>
        <div className="header-actions">
          <button className="secondary" onClick={() => setScreen("settings")}>
            ⚙️ Settings
          </button>
        </div>
      </header>

      {screen === "home" && (
        <section className="screen active">
          <div className="card">
            <h2>Choose Card Set</h2>
            <select value={currentSet} onChange={handleSetChange}>
              {cardsetOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="button-group cardset-actions">
              <button className="secondary" onClick={exportCardset}>
                📦 Export Cardset
              </button>
              <button
                className="secondary"
                onClick={() => importCardsetInputRef.current?.click()}
              >
                📤 Import Cardset
              </button>
              <button
                className="danger"
                disabled={isDefaultSet}
                onClick={handleDeleteCardset}
              >
                🗑 Delete Cardset
              </button>
              <input
                ref={importCardsetInputRef}
                type="file"
                hidden
                accept=".csv"
                onChange={handleImportCardset}
              />
            </div>
          </div>

          <div className="card">
            <div className="progress-header">
              <h2>Your Progress</h2>
              <button
                className="analytics-btn"
                onClick={() => setScreen("analytics")}
              >
                📊 Analytics
              </button>
            </div>
            <div className="progress-bar">
              <div id="progressFill" style={{ width: `${completePercent}%` }} />
            </div>
            <div id="progressText">{completePercent}% Complete</div>
            <div id="nextReviewBox">
              Next review: <span>{nextReviewLabel}</span>
            </div>
          </div>

          <div className="actions">
            <button onClick={startLearningSession}>▶ Continue Learning</button>
          </div>
        </section>
      )}

      {screen === "learn" && (
        <section className={`screen active ${currentCard ? "" : "waiting"}`}>
          <div className="top-bar">
            <button
              onClick={() => {
                stopListening();
                setScreen("home");
              }}
            >
              ← Home
            </button>
            <div id="learnProgress">
              {learnedCount} / {cards.length} learned
            </div>
          </div>

          <div className="card learn-card">
            <div id="text">{currentCard?.text || "🎉 Great job!"}</div>
            <div id="cardStatus">
              {currentCard
                ? getStageName(progress[currentCard.text]?.stage || 0)
                : "No cards are due"}
            </div>
          </div>

          <div id="recognizedText">
            {currentCard ? recognizedText : waitingMessage}
          </div>
          <div id="result" className={resultClass}>
            {result}
          </div>

          <div className="actions">
            <button
              className={listening ? "listening" : ""}
              disabled={!recognitionRef.current || !currentCard}
              onClick={toggleListening}
            >
              {listening ? "⏹ Stop Listening" : "🎤 Start Listening"}
            </button>
            <button
              disabled={!currentCard}
              onClick={() => currentCard && speakWord(currentCard.text)}
            >
              🔊 Repeat
            </button>
            <button
              disabled={!currentCard || !skipEnabled}
              onClick={skipCurrentCard}
            >
              ⏭ Skip
            </button>
          </div>
        </section>
      )}

      {screen === "analytics" && (
        <section className="screen active">
          <div className="top-bar">
            <button
              onClick={() => {
                stopListening();
                setScreen("home");
              }}
            >
              ← Home
            </button>
            <h2>Analytics</h2>
          </div>

          <div className="card">
            <div className="stats-grid">
              <div className="stat">
                <div>{learnedCount}</div>
                <span>Learned</span>
              </div>
              <div className="stat">
                <div>{review2Count}</div>
                <span>Repeat x2</span>
              </div>
              <div className="stat">
                <div>{review1Count}</div>
                <span>Repeat x1</span>
              </div>
              <div className="stat">
                <div>{newCount}</div>
                <span>New</span>
              </div>
            </div>
          </div>

          <div className="card">
            <table>
              <thead>
                <tr>
                  <th>Text</th>
                  <th>Status</th>
                  <th>Correct Answer</th>
                </tr>
              </thead>
              <tbody>
                {sortedAnalyticsCards.map((card) => {
                  const cardProgress = progress[card.text] || { stage: 0 };
                  return (
                    <tr key={card.text}>
                      <td>{card.text}</td>
                      <td className={getStageClass(cardProgress.stage)}>
                        {getStageName(cardProgress.stage)}
                      </td>
                      <td>{getAnswerText(card)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="actions">
            <button className="danger" onClick={resetProgress}>
              🔄 Reset Progress
            </button>
            <button className="secondary" onClick={openProgressSetup}>
              ⚙️ Setup Progress
            </button>
          </div>
        </section>
      )}

      {screen === "settings" && (
        <section className="screen active">
          <div className="top-bar">
            <button onClick={() => setScreen("home")}>← Home</button>
            <h2>Settings</h2>
          </div>

          <div className="card">
            <h3>App Theme</h3>
            <p className="help-text">
              Choose a high-contrast theme or let the app follow your system
              preference.
            </p>

            <div className="theme-options">
              {(["system", "light", "dark"] as ThemePreference[]).map(
                (option) => (
                  <label className="theme-option" key={option}>
                    <input
                      type="radio"
                      name="themeOption"
                      value={option}
                      checked={theme === option}
                      onChange={() => handleThemeChange(option)}
                    />
                    <div>
                      <strong>
                        {option[0].toUpperCase() + option.slice(1)}
                      </strong>
                      <div>
                        {option === "system"
                          ? "Follow your device theme preference."
                          : option === "light"
                            ? "Soft pastel light mode with strong contrast."
                            : "High-contrast dark mode for low vision support."}
                      </div>
                    </div>
                  </label>
                ),
              )}
            </div>

            <div className="setup-section">
              <h3>Database</h3>
              <p className="help-text">
                Delete the saved app database and reset indexed data. This does
                not remove your cardset files.
              </p>
              <div className="button-group">
                <button className="danger" onClick={handleDeleteDatabase}>
                  Delete Database
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === "progressSetup" && (
        <section className="screen active">
          <div className="top-bar">
            <button onClick={closeProgressSetup}>← Back</button>
            <h2>Setup Progress</h2>
          </div>

          <div className="card">
            <div className="setup-section">
              <h3>Bulk Operations</h3>
              <div className="button-group">
                <button className="secondary" onClick={() => setAllStages(0)}>
                  Mark All as New
                </button>
                <button className="secondary" onClick={() => setAllStages(1)}>
                  Mark All as Learning
                </button>
                <button className="secondary" onClick={() => setAllStages(3)}>
                  Mark All as Learned
                </button>
              </div>
            </div>

            <div className="setup-section">
              <h3>Individual Card Progress</h3>
              <input
                type="text"
                placeholder="Search cards..."
                className="search-input"
                value={progressSearch}
                onChange={(event) => setProgressSearch(event.target.value)}
              />
              <div className="card-list">
                {filteredSetupCards.map((card) => {
                  const cardProgress = progress[card.text] || {
                    stage: 0,
                    correctCount: 0,
                  };
                  return (
                    <div className="progress-card-item" key={card.text}>
                      <div className="progress-card-info">
                        <div className="progress-card-text">{card.text}</div>
                        <div className="progress-card-status">
                          {getStageName(cardProgress.stage)} -{" "}
                          {cardProgress.correctCount || 0} correct
                        </div>
                      </div>
                      <div className="progress-card-controls">
                        <select
                          value={cardProgress.stage}
                          onChange={(event) =>
                            setCardStage(card, Number(event.target.value))
                          }
                        >
                          <option value={0}>New</option>
                          <option value={1}>Learning x1</option>
                          <option value={2}>Learning x2</option>
                          <option value={3}>Learned</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="setup-section">
              <h3>Import / Export Progress</h3>
              <div className="button-group">
                <button className="secondary" onClick={exportProgress}>
                  📥 Export Progress
                </button>
                <button
                  className="secondary"
                  onClick={() => importProgressInputRef.current?.click()}
                >
                  📤 Import Progress
                </button>
                <input
                  ref={importProgressInputRef}
                  type="file"
                  hidden
                  accept=".csv"
                  onChange={handleImportProgress}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="primary" onClick={doneProgressSetup}>
                Done
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
