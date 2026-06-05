// =====================================================
// APP STATE
// =====================================================

const STORAGE_KEY = "voice-trainer-progress";
const SETTINGS_KEY = "voice-trainer-settings";

const REVIEW_1_DELAY = 30 * 1000; // 30 sec
const REVIEW_2_DELAY = 60 * 1000; // 1 min

let cards = [];
let progress = {};
let currentCard = null;
let listening = false;
let recognition = null;
let sessionSkippedCards = new Set();

let currentSet = "body-parts";

// =====================================================
// DOM
// =====================================================

const homeScreen =
    document.getElementById("homeScreen");

const learnScreen =
    document.getElementById("learnScreen");

const analyticsScreen =
    document.getElementById("analyticsScreen");

const cardSetSelect =
    document.getElementById("cardSetSelect");

const continueBtn =
    document.getElementById("continueBtn");

const analyticsBtn =
    document.getElementById("analyticsBtn");

const resetBtn =
    document.getElementById("resetBtn");

const backHomeBtn =
    document.getElementById("backHomeBtn");

const analyticsBackBtn =
    document.getElementById("analyticsBackBtn");

const wordEl =
    document.getElementById("word");

const cardStatusEl =
    document.getElementById("cardStatus");

const progressFill =
    document.getElementById("progressFill");

const progressText =
    document.getElementById("progressText");

const nextReviewTime =
    document.getElementById("nextReviewTime");

const learnProgress =
    document.getElementById("learnProgress");

const recognizedText =
    document.getElementById("recognizedText");

const resultEl =
    document.getElementById("result");

const listenBtn =
    document.getElementById("listenBtn");

const speakBtn =
    document.getElementById("speakBtn");

const nextBtn =
    document.getElementById("nextBtn");

const setupProgressBtn =
    document.getElementById("setupProgressBtn");

const progressSetupModal =
    document.getElementById("progressSetupModal");

const closeProgressSetupBtn =
    document.getElementById("closeProgressSetupBtn");

const markAllNewBtn =
    document.getElementById("markAllNewBtn");

const markAllLearningBtn =
    document.getElementById("markAllLearningBtn");

const markAllLearnedBtn =
    document.getElementById("markAllLearnedBtn");

const progressSearchInput =
    document.getElementById("progressSearchInput");

const progressCardList =
    document.getElementById("progressCardList");

const exportProgressBtn =
    document.getElementById("exportProgressBtn");

const importProgressBtn =
    document.getElementById("importProgressBtn");

const importProgressFile =
    document.getElementById("importProgressFile");

const confirmSetupProgressBtn =
    document.getElementById("confirmSetupProgressBtn");

// =====================================================
// SCREEN NAVIGATION
// =====================================================

function showScreen(screen) {

    homeScreen.classList.remove("active");
    learnScreen.classList.remove("active");
    analyticsScreen.classList.remove("active");

    screen.classList.add("active");
}

// =====================================================
// SETTINGS
// =====================================================

function loadSettings() {

    const settings =
        JSON.parse(
            localStorage.getItem(SETTINGS_KEY)
            || "{}"
        );

    currentSet =
        settings.currentSet ||
        "body-parts";

    cardSetSelect.value =
        currentSet;
}

function saveSettings() {

    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({
            currentSet
        })
    );
}

// =====================================================
// STORAGE
// =====================================================

function loadProgress() {

    const allProgress =
        JSON.parse(
            localStorage.getItem(STORAGE_KEY)
            || "{}"
        );

    progress =
        allProgress[currentSet]
        || {};
}

function saveProgress() {

    const allProgress =
        JSON.parse(
            localStorage.getItem(STORAGE_KEY)
            || "{}"
        );

    allProgress[currentSet] =
        progress;

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(allProgress)
    );
}

// =====================================================
// CARD SET LOADING
// =====================================================

async function loadCardSet() {

    const response =
        await fetch(
            `cardsets/${currentSet}.json`
        );

    cards =
        await response.json();

    initializeMissingProgress();

    updateHomeStats();
}

function initializeMissingProgress() {

    for (const card of cards) {

        if (!progress[card.word]) {

            progress[card.word] = {

                stage: 0,

                nextReview: 0,

                correctCount: 0
            };
        }
    }

    saveProgress();
}

// =====================================================
// HELPERS
// =====================================================

function getCardProgress(word) {

    return progress[word];
}

function getStageName(stage) {

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

function getLearnedCount() {

    return Object.values(progress)
        .filter(p => p.stage === 3)
        .length;
}

function getReview1Count() {

    return Object.values(progress)
        .filter(p => p.stage === 1)
        .length;
}

function getReview2Count() {

    return Object.values(progress)
        .filter(p => p.stage === 2)
        .length;
}

function getNewCount() {

    return Object.values(progress)
        .filter(p => p.stage === 0)
        .length;
}

// =====================================================
// HOME SCREEN
// =====================================================

function updateHomeStats() {

    const total =
        cards.length;

    const learned =
        getLearnedCount();

    const percent =
        total === 0
            ? 0
            : Math.round(
                learned * 100 / total
            );

    progressFill.style.width =
        `${percent}%`;

    progressText.textContent =
        `${percent}% Complete`;

    updateNextReviewLabel();
}

// =====================================================
// NEXT REVIEW LABEL
// =====================================================

function updateNextReviewLabel() {

    const now = Date.now();

    let nearest = null;

    for (const item of Object.values(progress)) {

        if (
            item.stage < 3 &&
            item.nextReview > now
        ) {

            if (
                nearest === null ||
                item.nextReview < nearest
            ) {

                nearest =
                    item.nextReview;
            }
        }
    }

    if (nearest === null) {

        nextReviewTime.textContent =
            "Ready now";

        return;
    }

    const seconds =
        Math.max(
            0,
            Math.ceil(
                (nearest - now) / 1000
            )
        );

    nextReviewTime.textContent =
        `${seconds} sec`;
}

// =====================================================
// EVENTS
// =====================================================

cardSetSelect.addEventListener(
    "change",
    async () => {

        currentSet =
            cardSetSelect.value;

        saveSettings();

        loadProgress();

        await loadCardSet();
    }
);

continueBtn.addEventListener(
    "click",
    () => {

        showScreen(
            learnScreen
        );

        startLearningSession();
    }
);

analyticsBtn.addEventListener(
    "click",
    () => {

        buildAnalytics();

        showScreen(
            analyticsScreen
        );
    }
);

backHomeBtn.addEventListener(
    "click",
    () => {

        showScreen(
            homeScreen
        );

        updateHomeStats();
    }
);

analyticsBackBtn.addEventListener(
    "click",
    () => {

        showScreen(
            homeScreen
        );
    }
);

resetBtn.addEventListener(
    "click",
    () => {

        const confirmed =
            confirm(
                `Reset progress for "${currentSet}"?`
            );

        if (!confirmed) {
            return;
        }

        progress = {};

        initializeMissingProgress();

        updateHomeStats();
    }
);

setupProgressBtn.addEventListener(
    "click",
    () => {
        openProgressSetupModal();
    }
);

closeProgressSetupBtn.addEventListener(
    "click",
    () => {
        closeProgressSetupModal();
    }
);

confirmSetupProgressBtn.addEventListener(
    "click",
    () => {
        // Save the progress changes
        saveProgress();

        // Clear the backup so closeProgressSetupModal won't restore old state
        progressBackup = null;

        closeProgressSetupModal();
        updateHomeStats();

        // Rebuild analytics if it's currently visible
        if (
            analyticsScreen
                .classList.contains("active")
        ) {
            buildAnalytics();
        }
    }
);

markAllNewBtn.addEventListener(
    "click",
    () => {
        markAllCardsAsNew();
    }
);

markAllLearningBtn.addEventListener(
    "click",
    () => {
        markAllCardsAsLearning();
    }
);

markAllLearnedBtn.addEventListener(
    "click",
    () => {
        markAllCardsAsLearned();
    }
);

exportProgressBtn.addEventListener(
    "click",
    () => {
        exportProgress();
    }
);

importProgressBtn.addEventListener(
    "click",
    () => {
        importProgressFile.click();
    }
);

importProgressFile.addEventListener(
    "change",
    (event) => {
        handleImportProgress(event);
    }
);

progressSearchInput.addEventListener(
    "input",
    (event) => {
        renderProgressCardList(event.target.value);
    }
);

// Close modal when clicking outside
progressSetupModal.addEventListener(
    "click",
    (event) => {
        if (event.target === progressSetupModal) {
            closeProgressSetupModal();
        }
    }
);

// =====================================================
// CARD SELECTION
// =====================================================

function getDueCards() {

    const now = Date.now();

    return cards.filter(card => {

        if (sessionSkippedCards.has(card.word)) {
            return false;
        }

        const p =
            getCardProgress(card.word);

        if (!p) {
            return false;
        }

        if (p.stage >= 3) {
            return false;
        }

        return p.nextReview <= now;
    });
}

function getNextDueTimestamp() {

    let nextTime = null;

    for (const card of cards) {

        const p =
            getCardProgress(card.word);

        if (!p) {
            continue;
        }

        if (p.stage >= 3) {
            continue;
        }

        if (
            nextTime === null ||
            p.nextReview < nextTime
        ) {

            nextTime =
                p.nextReview;
        }
    }

    return nextTime;
}

function selectNextCard() {

    const dueCards =
        getDueCards();

    if (
        dueCards.length === 0
    ) {

        currentCard = null;

        showWaitingScreen();

        return;
    }

    dueCards.sort((a, b) => {

        const pa =
            getCardProgress(a.word);

        const pb =
            getCardProgress(b.word);

        return pa.stage - pb.stage;
    });

    currentCard =
        dueCards[0];

    showCurrentCard();
}

// =====================================================
// LEARNING SESSION
// =====================================================

function startLearningSession() {

    resultEl.textContent = "";
    recognizedText.textContent = "";

    sessionSkippedCards.clear();

    selectNextCard();
}

function showCurrentCard() {

    if (!currentCard) {
        return;
    }

    learnScreen.classList.remove("waiting");

    const p =
        getCardProgress(
            currentCard.word
        );

    wordEl.textContent =
        currentCard.word;

    cardStatusEl.textContent =
        getStageName(
            p.stage
        );

    recognizedText.textContent =
        listening
            ? "🎤 Listening..."
            : "Press Start Listening";

    resultEl.textContent = "";

    updateLearningProgress();

    updateSkipButtonState(true);

    speakWord(
        currentCard.word
    );
}

function updateLearningProgress() {

    const learned =
        getLearnedCount();

    learnProgress.textContent =
        `${learned} / ${cards.length} learned`;
}

function updateSkipButtonState(enabled) {

    nextBtn.disabled = !enabled;

}

// =====================================================
// CORRECT ANSWER
// =====================================================

function markCorrect(card) {

    const p =
        getCardProgress(card.word);

    const now =
        Date.now();

    if (p.stage === 0) {

        p.stage = 1;

        p.nextReview =
            now +
            REVIEW_1_DELAY;

    } else if (
        p.stage === 1
    ) {

        p.stage = 2;

        p.nextReview =
            now +
            REVIEW_2_DELAY;

    } else if (
        p.stage === 2
    ) {

        p.stage = 3;

        p.nextReview = 0;
    }

    p.correctCount++;

    saveProgress();

    updateHomeStats();

    resultEl.textContent =
        "✅ Correct";

    resultEl.className =
        "correct";

    setTimeout(() => {

        selectNextCard();

    }, 1500);
}

// =====================================================
// WRONG ANSWER
// =====================================================

function markWrong(card) {

    const p =
        getCardProgress(card.word);

    const now =
        Date.now();

    if (
        p.stage > 0
    ) {

        p.stage--;
    }

    p.nextReview =
        now;

    sessionSkippedCards.add(card.word);

    saveProgress();

    updateHomeStats();

    resultEl.textContent =
        "❌ Wrong";

    resultEl.className =
        "wrong";
}

// =====================================================
// SKIP BUTTON
// =====================================================

function skipCurrentCard() {

    if (!currentCard) {
        return;
    }

    const p =
        getCardProgress(
            currentCard.word
        );

    const now =
        Date.now();

    if (
        p.stage > 0
    ) {

        p.stage--;
    }

    p.nextReview =
        now;

    sessionSkippedCards.add(
        currentCard.word
    );

    saveProgress();

    updateHomeStats();

    resultEl.textContent =
        "⏭ Skipped";

    resultEl.className =
        "skipped";

    updateSkipButtonState(false);

    setTimeout(() => {

        selectNextCard();

    }, 1500);
}

nextBtn.addEventListener(
    "click",
    skipCurrentCard
);

// =====================================================
// WAITING SCREEN
// =====================================================

let waitingTimer = null;

function showWaitingScreen() {

    stopListening();

    learnScreen.classList.add("waiting");

    wordEl.textContent =
        "🎉 Great job!";

    cardStatusEl.textContent =
        "No cards are due";

    resultEl.textContent = "";

    updateLearningProgress();

    updateSkipButtonState(false);

    if (
        waitingTimer
    ) {

        clearInterval(
            waitingTimer
        );
    }

    updateWaitingDisplay();

    waitingTimer =
        setInterval(
            updateWaitingDisplay,
            1000
        );
}

function updateWaitingDisplay() {

    const nextTime =
        getNextDueTimestamp();

    if (
        nextTime === null
    ) {

        recognizedText.textContent =
            "All cards learned 🎉";

        clearInterval(
            waitingTimer
        );

        return;
    }

    const now =
        Date.now();

    const remaining =
        Math.max(
            0,
            Math.ceil(
                (
                    nextTime - now
                ) / 1000
            )
        );

    recognizedText.textContent =
        `⏳ Next review in ${remaining} sec`;

    if (
        remaining <= 0
    ) {

        clearInterval(
            waitingTimer
        );

        selectNextCard();
    }
}

// =====================================================
// ANSWER CHECKING
// =====================================================

function normalize(text) {

    return text
        .toLowerCase()
        .trim()
        .replace(
            /[.,!?]/g,
            ""
        );
}

function checkAnswer(text) {

    if (
        !currentCard
    ) {

        return;
    }

    const spoken =
        normalize(text);

    const answers =
        currentCard.answers.map(
            normalize
        );

    if (
        answers.includes(
            spoken
        )
    ) {

        markCorrect(
            currentCard
        );

    } else {

        markWrong(
            currentCard
        );
    }
}

// =====================================================
// SPEECH SYNTHESIS
// =====================================================

speechSynthesis.getVoices();

speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
};

function getEnglishVoice() {

    const voices =
        speechSynthesis.getVoices();

    let voice =
        voices.find(v =>
            v.lang === "en-US"
        );

    if (voice) {
        return voice;
    }

    voice =
        voices.find(v =>
            v.lang.startsWith("en")
        );

    return voice || null;
}

function speakWord(text) {

    if (!text) {
        return;
    }

    speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(
            text
        );

    const voice =
        getEnglishVoice();

    if (voice) {
        utterance.voice =
            voice;
    }

    utterance.lang =
        "en-US";

    utterance.rate =
        0.9;

    utterance.pitch =
        1;

    speechSynthesis.speak(
        utterance
    );
}

// =====================================================
// REPEAT BUTTON
// =====================================================

speakBtn.addEventListener(
    "click",
    () => {

        if (
            currentCard
        ) {

            speakWord(
                currentCard.word
            );
        }
    }
);

// =====================================================
// SPEECH RECOGNITION
// =====================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (!SpeechRecognition) {

    listenBtn.disabled =
        true;

    recognizedText.textContent =
        "Speech recognition not supported";

} else {

    recognition =
        new SpeechRecognition();

    recognition.lang =
        "ru-RU";

    recognition.interimResults =
        false;

    recognition.maxAlternatives =
        1;

    // ==========================================
    // RESULT
    // ==========================================

    recognition.onresult =
        event => {

            const transcript =
                event.results[0][0]
                .transcript;

            recognizedText.textContent =
                `You said: ${transcript}`;

            checkAnswer(
                transcript
            );
        };

    // ==========================================
    // ERRORS
    // ==========================================

    recognition.onerror =
        event => {

            if (
                event.error ===
                "no-speech"
            ) {

                return;
            }

            console.log(
                "Speech error:",
                event.error
            );

            recognizedText.textContent =
                `Error: ${event.error}`;
        };

    // ==========================================
    // AUTO RESTART
    // ==========================================

    recognition.onend =
        () => {

            if (
                listening
            ) {

                try {

                    recognition.start();

                } catch (e) {

                    // browser may throw
                    // if already started
                }
            }
        };

    // ==========================================
    // LISTEN BUTTON
    // ==========================================

    listenBtn.addEventListener(
        "click",
        () => {

            if (
                !listening
            ) {

                startListening();

            } else {

                stopListening();
            }
        }
    );
}

// =====================================================
// LISTENING CONTROL
// =====================================================

function startListening() {

    if (
        !recognition
    ) {

        return;
    }

    listening =
        true;

    listenBtn.textContent =
        "⏹ Stop Listening";

    listenBtn.classList.add(
        "listening"
    );

    recognizedText.textContent =
        "🎤 Listening...";

    try {

        recognition.start();

    } catch (e) {

        // ignore
    }
}

function stopListening() {

    if (
        !recognition
    ) {

        return;
    }

    listening =
        false;

    listenBtn.textContent =
        "🎤 Start Listening";

    listenBtn.classList.remove(
        "listening"
    );

    recognizedText.textContent =
        "Listening stopped";

    try {

        recognition.stop();

    } catch (e) {

        // ignore
    }
}

// =====================================================
// STOP LISTENING WHEN LEAVING
// =====================================================

backHomeBtn.addEventListener(
    "click",
    () => {

        stopListening();
    }
);

analyticsBackBtn.addEventListener(
    "click",
    () => {

        stopListening();
    }
);

// =====================================================
// OPTIONAL AUTO-LISTEN
// =====================================================

// If you want the microphone
// to start automatically
// every time user enters
// learning mode, uncomment:
//
// continueBtn.addEventListener(
//     "click",
//     () => {
//         startListening();
//     }
// );

// =====================================================
// ANALYTICS
// =====================================================

function buildAnalytics() {

    document.getElementById(
        "analyticsLearned"
    ).textContent =
        getLearnedCount();

    document.getElementById(
        "analyticsStage1"
    ).textContent =
        getReview1Count();

    document.getElementById(
        "analyticsStage2"
    ).textContent =
        getReview2Count();

    document.getElementById(
        "analyticsNew"
    ).textContent =
        getNewCount();

    const tbody =
        document.querySelector(
            "#analyticsTable tbody"
        );

    tbody.innerHTML = "";

    const sortedCards =
        [...cards].sort(
            (a, b) =>
                a.word.localeCompare(
                    b.word
                )
        );

    for (const card of sortedCards) {

        const p =
            getCardProgress(
                card.word
            );

        const row =
            document.createElement(
                "tr"
            );

        const wordCell =
            document.createElement(
                "td"
            );

        wordCell.textContent =
            card.word;

        const statusCell =
            document.createElement(
                "td"
            );

        let statusText =
            "";

        let className =
            "";

        switch (
            p.stage
        ) {

            case 0:

                statusText =
                    "🆕 New";

                className =
                    "status-new";

                break;

            case 1:

                statusText =
                    "🔁 Repeat x1";

                className =
                    "status-review1";

                break;

            case 2:

                statusText =
                    "🔁 Repeat x2";

                className =
                    "status-review2";

                break;

            case 3:

                statusText =
                    "✅ Learned";

                className =
                    "status-learned";

                break;
        }

        statusCell.textContent =
            statusText;

        statusCell.className =
            className;

        row.appendChild(
            wordCell
        );

        row.appendChild(
            statusCell
        );

        tbody.appendChild(
            row
        );
    }
}

// =====================================================
// HOME SCREEN AUTO REFRESH
// =====================================================

setInterval(
    () => {

        if (
            homeScreen.classList.contains(
                "active"
            )
        ) {

            updateNextReviewLabel();
        }

    },
    1000
);

// =====================================================
// AUTO REFRESH LEARNING SCREEN
// =====================================================

setInterval(
    () => {

        if (
            !learnScreen.classList.contains(
                "active"
            )
        ) {

            return;
        }

        if (
            currentCard
        ) {

            return;
        }

        const nextDue =
            getNextDueTimestamp();

        if (
            nextDue === null
        ) {

            return;
        }

        if (
            nextDue <= Date.now()
        ) {

            selectNextCard();
        }

    },
    1000
);

// =====================================================
// PROGRESS SETUP MODAL
// =====================================================

let progressBackup = null;

function openProgressSetupModal() {

    // Save current progress state before making changes
    progressBackup =
        JSON.parse(
            JSON.stringify(progress)
        );

    renderProgressCardList("");
    progressSearchInput.value = "";
    progressSetupModal.classList.add("active");
}

function closeProgressSetupModal() {

    progressSetupModal.classList.remove("active");

    // Restore progress if no changes were confirmed
    if (progressBackup !== null) {

        progress = progressBackup;
        progressBackup = null;
    }
}

function markAllCardsAsNew() {

    const confirmed =
        confirm(
            "Mark all cards as new? This will reset progress for all cards."
        );

    if (!confirmed) {
        return;
    }

    for (const card of cards) {

        progress[card.word] = {
            stage: 0,
            nextReview: 0,
            correctCount: 0
        };
    }

    renderProgressCardList("");
}

function markAllCardsAsLearning() {

    const confirmed =
        confirm(
            "Mark all cards as learning (Stage 1)?"
        );

    if (!confirmed) {
        return;
    }

    const now = Date.now();

    for (const card of cards) {

        progress[card.word] = {
            stage: 1,
            nextReview: now,
            correctCount: 1
        };
    }

    renderProgressCardList("");
}

function markAllCardsAsLearned() {

    const confirmed =
        confirm(
            "Mark all cards as learned? You can always undo this."
        );

    if (!confirmed) {
        return;
    }

    for (const card of cards) {

        progress[card.word] = {
            stage: 3,
            nextReview: 0,
            correctCount: 3
        };
    }

    renderProgressCardList("");
}

function renderProgressCardList(searchTerm = "") {

    const filteredCards =
        cards.filter(card =>
            card.word
                .toLowerCase()
                .includes(
                    searchTerm.toLowerCase()
                )
        );

    progressCardList.innerHTML = "";

    for (const card of filteredCards) {

        const p =
            getCardProgress(card.word);

        const item =
            document.createElement("div");

        item.className =
            "progress-card-item";

        const info =
            document.createElement("div");

        info.className =
            "progress-card-info";

        const wordDiv =
            document.createElement("div");

        wordDiv.className =
            "progress-card-word";

        wordDiv.textContent =
            card.word;

        const statusDiv =
            document.createElement("div");

        statusDiv.className =
            "progress-card-status";

        statusDiv.textContent =
            getStageName(p.stage) +
            " (Correct: " +
            p.correctCount +
            ")";

        info.appendChild(wordDiv);
        info.appendChild(statusDiv);

        const controls =
            document.createElement("div");

        controls.className =
            "progress-card-controls";

        const select =
            document.createElement("select");

        const stages = [
            { value: 0, label: "🆕 New" },
            { value: 1, label: "🔁 Repeat x1" },
            { value: 2, label: "🔁 Repeat x2" },
            { value: 3, label: "✅ Learned" }
        ];

        for (const stage of stages) {

            const option =
                document.createElement("option");

            option.value = stage.value;
            option.textContent = stage.label;
            option.selected =
                p.stage === stage.value;

            select.appendChild(option);
        }

        select.addEventListener(
            "change",
            (event) => {

                const newStage =
                    parseInt(
                        event.target.value
                    );

                p.stage = newStage;
                p.nextReview = 0;

                if (newStage > 0) {
                    p.nextReview =
                        Date.now();
                }

                renderProgressCardList(
                    progressSearchInput.value
                );
            }
        );

        controls.appendChild(select);

        item.appendChild(info);
        item.appendChild(controls);

        progressCardList.appendChild(item);
    }

    if (filteredCards.length === 0) {

        const emptyMsg =
            document.createElement("div");

        emptyMsg.style.padding =
            "20px";

        emptyMsg.style.textAlign =
            "center";

        emptyMsg.style.color =
            "var(--muted)";

        emptyMsg.textContent =
            "No cards found";

        progressCardList.appendChild(
            emptyMsg
        );
    }
}

function exportProgress() {

    const dataToExport = {

        setName: currentSet,
        timestamp: new Date().toISOString(),
        progress: progress,
        cards: cards
    };

    const json =
        JSON.stringify(
            dataToExport,
            null,
            2
        );

    const blob =
        new Blob(
            [json],
            { type: "application/json" }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;
    link.download =
        `${currentSet}-progress-${
            new Date()
                .toISOString()
                .split("T")[0]
        }.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

function handleImportProgress(event) {

    const file =
        event.target.files[0];

    if (!file) {
        return;
    }

    const reader =
        new FileReader();

    reader.onload = (e) => {

        try {

            const data =
                JSON.parse(
                    e.target.result
                );

            if (!data.progress) {

                alert(
                    "Invalid progress file"
                );

                return;
            }

            const confirmed =
                confirm(
                    `Import progress from "${
                        data.setName
                    }"? This will overwrite current progress.`
                );

            if (!confirmed) {
                return;
            }

            progress = data.progress;
            saveProgress();

            renderProgressCardList("");

            alert(
                "Progress imported successfully!"
            );

        } catch (error) {

            alert(
                "Error reading file: " +
                error.message
            );
        }
    };

    reader.readAsText(file);

    // Reset file input
    event.target.value = "";
}

// =====================================================
// DEBUG HELPERS
// =====================================================

// Uncomment for testing:
//
// window.resetAllProgress = () => {
//     localStorage.clear();
//     location.reload();
// };
//
// window.showProgress = () => {
//     console.log(progress);
// };

// =====================================================
// APP STARTUP
// =====================================================

async function init() {

    loadSettings();

    loadProgress();

    await loadCardSet();

    updateHomeStats();

    showScreen(
        homeScreen
    );
}

init();
