if ("speechSynthesis" in window) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => {
    speechSynthesis.getVoices();
  };
}

function getEnglishVoice() {
  const voices = speechSynthesis.getVoices();
  return (
    // voices.find((voice) => voice.lang === "ro-RO") ||
    voices.find((voice) => voice.lang === "en-US") ||
    voices.find((voice) => voice.lang.startsWith("en")) ||
    null
  );
}

export function speakWord(text: string, onEnd?: () => void) {
  if (!text || !("speechSynthesis" in window)) {
    onEnd?.();
    return;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getEnglishVoice();
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    onEnd?.();
  };

  if (voice) utterance.voice = voice;
  // utterance.lang = "ro-RO";
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  utterance.pitch = 1;
  utterance.onend = finish;
  utterance.onerror = finish;
  speechSynthesis.speak(utterance);
}
