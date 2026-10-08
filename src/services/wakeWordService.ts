const WAKE_WORD_STORAGE_KEY = "muskan_wake_word_enabled";

export function loadWakeWordPreference(): boolean {
  try {
    const saved = localStorage.getItem(WAKE_WORD_STORAGE_KEY);
    // Enabled by default (true) so after one-time setup "Hello Muskan" works out of the box
    if (saved === null) return true;
    return saved === "true";
  } catch {
    return true;
  }
}

export function saveWakeWordPreference(enabled: boolean): void {
  try {
    localStorage.setItem(WAKE_WORD_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Plays a crisp futuristic holographic chime when "Hello Muskan" wake word is detected.
 */
export function playWakeChime(): void {
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.18); // A5

    osc2.frequency.setValueAtTime(880, now);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.22); // D6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.34);
    osc2.stop(now + 0.34);

    setTimeout(() => {
      if (ctx.state !== "closed") {
        ctx.close().catch(() => {});
      }
    }, 450);
  } catch {
    // Ignore audio context errors
  }
}

/**
 * Checks whether a spoken transcript contains the "Hello Muskan" / "Hey Muskan" / "Muskan" wake phrase.
 */
export function isWakeWordMatch(transcript: string): boolean {
  const lower = transcript.toLowerCase().trim();
  if (!lower) return false;

  return (
    /\b(hello\s*muskan|hey\s*muskan|hi\s*muskan|wake\s*up\s*muskan|assalamualaikum\s*muskan|salam\s*muskan|muskan\s*on|muskan\s*start|muskan\s*sun|muskan\s*suno|muskan)\b/i.test(
      lower,
    ) ||
    /(हेलो\s*मुस्कान|हे\s*मुस्कान|हाय\s*मुस्कान|मुस्कान\s*ऑन|मुस्कान\s*सुनो|अस्सलामु\s*अलैकुम\s*मुस्कान|मुस्कान)/.test(
      transcript,
    )
  );
}
