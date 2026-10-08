let activeAudioContext: AudioContext | null = null;
let activeSource: AudioBufferSourceNode | null = null;

export function stopCurrentAudio(): void {
  try {
    if (activeSource) {
      activeSource.onended = null;
      activeSource.stop();
      activeSource.disconnect();
      activeSource = null;
    }
  } catch {
    // Ignore if already stopped
  }

  try {
    if (activeAudioContext && activeAudioContext.state !== "closed") {
      activeAudioContext.close().catch(() => {});
    }
  } catch {
    // Ignore close errors
  } finally {
    activeAudioContext = null;
  }

  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // Ignore
  }
}

export async function speakBrowserFallback(text: string): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }
  stopCurrentAudio();
  return new Promise<void>((resolve) => {
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "hi-IN";
      utterance.rate = 1.05;
      utterance.pitch = 1.1;
      const voices = window.speechSynthesis.getVoices();
      const femaleHindiOrIn = voices.find(
        (v) =>
          (v.lang.includes("IN") || v.lang.includes("hi")) &&
          /female|google|heera|kalpana|swara|veena/i.test(v.name),
      );
      if (femaleHindiOrIn) {
        utterance.voice = femaleHindiOrIn;
      }
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    } catch {
      resolve();
    }
  });
}

export async function playPCM(base64Data: string): Promise<void> {
  stopCurrentAudio();

  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioCtx = new AudioContextClass({ sampleRate: 24000 });
    activeAudioContext = audioCtx;

    if (audioCtx.state === "suspended") {
      await audioCtx.resume().catch(() => {});
    }

    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = new Int16Array(bytes.buffer);
    const audioBuffer = audioCtx.createBuffer(1, buffer.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      channelData[i] = buffer[i] / 32768.0;
    }

    const source = audioCtx.createBufferSource();
    activeSource = source;
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();

    return new Promise<void>((resolve) => {
      source.onended = () => {
        if (activeSource === source) {
          activeSource = null;
        }
        if (audioCtx.state !== "closed") {
          audioCtx.close().catch(() => {});
        }
        if (activeAudioContext === audioCtx) {
          activeAudioContext = null;
        }
        resolve();
      };
    });
  } catch {
    stopCurrentAudio();
  }
}
