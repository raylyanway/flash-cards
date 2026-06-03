let cards = [];
let currentIndex = 0;

const wordEl = document.getElementById("word");
const progressEl = document.getElementById("progress");
const recognizedEl = document.getElementById("recognizedText");
const resultEl = document.getElementById("result");

const listenBtn = document.getElementById("listenBtn");
const nextBtn = document.getElementById("nextBtn");

async function loadCards() {
    const response = await fetch("cards.json");
    cards = await response.json();

    showCard();
}

function showCard() {

    if (currentIndex >= cards.length) {

        wordEl.textContent = "🎉 Finished!";
        progressEl.textContent = `${cards.length}/${cards.length}`;

        listenBtn.disabled = true;
        nextBtn.disabled = true;

        return;
    }

    const card = cards[currentIndex];

    wordEl.textContent = card.word;

    progressEl.textContent =
        `${currentIndex + 1} / ${cards.length}`;

    recognizedEl.textContent =
        "Press Start and say translation";

    resultEl.textContent = "";
    resultEl.className = "";
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
            showCard();
        }, 1000);

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

    recognition.onresult = event => {

        const transcript =
            event.results[0][0].transcript;

        recognizedEl.textContent =
            `You said: ${transcript}`;

        checkAnswer(transcript);
    };

    recognition.onerror = event => {

        recognizedEl.textContent =
            `Error: ${event.error}`;
    };

    listenBtn.addEventListener(
        "click",
        () => recognition.start()
    );
}

nextBtn.addEventListener("click", () => {
    currentIndex++;
    showCard();
});

loadCards();
