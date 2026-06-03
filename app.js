let cards = [];
let currentIndex = 0;
let listening = false;

const STORAGE_KEY = "flashcards-current-index";

const wordEl = document.getElementById("word");
const progressEl = document.getElementById("progress");
const recognizedEl = document.getElementById("recognizedText");
const resultEl = document.getElementById("result");

const listenBtn = document.getElementById("listenBtn");
const nextBtn = document.getElementById("nextBtn");
const speakBtn = document.getElementById("speakBtn");

speechSynthesis.getVoices();

speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
};

function saveProgress() {
    localStorage.setItem(
        STORAGE_KEY,
        currentIndex
    );
}

function speakWord(text) {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const voices = speechSynthesis.getVoices();

    const englishVoice = voices.find(
        voice => voice.lang.startsWith("en")
    );

    if (englishVoice) {
        utterance.voice = englishVoice;
    }

    utterance.lang = "en-US";
    utterance.rate = 0.9;
    utterance.pitch = 1;

    speechSynthesis.speak(utterance);
}

async function loadCards() {
    const response = await fetch("cards.json");
    cards = await response.json();

    const savedIndex = parseInt(
        localStorage.getItem(STORAGE_KEY)
    );

    if (
        !isNaN(savedIndex) &&
        savedIndex >= 0 &&
        savedIndex < cards.length
    ) {
        currentIndex = savedIndex;
    }

    showCard();
}

function showCard() {
    if (currentIndex >= cards.length) {

        listening = false;

        localStorage.removeItem(STORAGE_KEY);

        wordEl.textContent = "🎉 Finished!";
        progressEl.textContent =
            `${cards.length}/${cards.length}`;

        listenBtn.disabled = true;
        nextBtn.disabled = true;
        speakBtn.disabled = true;

        return;
    }

    const card = cards[currentIndex];

    wordEl.textContent = card.word;

    progressEl.textContent =
        `${currentIndex + 1} / ${cards.length}`;

    recognizedEl.textContent =
        listening
            ? "🎤 Listening..."
            : "Press Start and say translation";

    resultEl.textContent = "";
    resultEl.className = "";

    speakWord(card.word);
}

function normalize(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[.,!?]/g, "");
}

function checkAnswer(text) {
    const spoken = normalize(text);

    const answers =
        cards[currentIndex].answers.map(normalize);

    if (answers.includes(spoken)) {

        resultEl.textContent = "✅ Correct";
        resultEl.className = "correct";

        setTimeout(() => {

            currentIndex++;

            saveProgress();

            showCard();

        }, 1500);

    } else {

        resultEl.textContent = "❌ Try again";
        resultEl.className = "wrong";
    }
}

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (!SpeechRecognition) {

    listenBtn.disabled = true;

    recognizedEl.textContent =
        "Speech recognition not supported.";

} else {

    const recognition =
        new SpeechRecognition();

    recognition.lang = "ru-RU";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = event => {

        const transcript =
            event.results[0][0].transcript;

        recognizedEl.textContent =
            `You said: ${transcript}`;

        checkAnswer(transcript);
    };

    recognition.onerror = event => {

        if (event.error !== "no-speech") {

            recognizedEl.textContent =
                `Error: ${event.error}`;
        }
    };

    recognition.onend = () => {

        if (
            listening &&
            currentIndex < cards.length
        ) {
            recognition.start();
        }
    };

    listenBtn.addEventListener("click", () => {

        if (!listening) {

            listening = true;

            listenBtn.textContent =
                "⏹ Stop Listening";

            recognizedEl.textContent =
                "🎤 Listening...";

            recognition.start();

        } else {

            listening = false;

            listenBtn.textContent =
                "🎤 Start Listening";

            recognizedEl.textContent =
                "Listening stopped";

            recognition.stop();
        }
    });
}

nextBtn.addEventListener("click", () => {

    currentIndex++;

    saveProgress();

    showCard();
});

speakBtn.addEventListener("click", () => {

    if (currentIndex < cards.length) {

        speakWord(
            cards[currentIndex].word
        );
    }
});

loadCards();
