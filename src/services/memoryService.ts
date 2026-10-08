export interface ChatMessage {
  id: string;
  sender: "user" | "muskan";
  text: string;
  timestamp: number;
}

export interface DailyIntelCache {
  dateKey: string;
  timestamp: number;
  summary: string;
}

const HISTORY_STORAGE_KEY = "muskan_chat_history";
const NOTES_STORAGE_KEY = "muskan_persistent_notes";
const DAILY_INTEL_STORAGE_KEY = "muskan_daily_intel_cache";

/**
 * Returns accurate, real-time date and time details (in Asia/Kolkata IST and local browser time).
 */
export function getLiveDateTimeInfo() {
  const now = new Date();
  const istFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const istTimeFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD

  const fullDateStr = istFormatter.format(now);
  const fullTimeStr = istTimeFormatter.format(now);

  return {
    dateKey: dateParts,
    fullDateStr,
    fullTimeStr,
    year: now.getFullYear(),
    monthName: now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "long",
    }),
    dayOfMonth: now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
    }),
    weekday: now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
    }),
  };
}

/**
 * Loads cached daily intelligence briefing for today if available.
 */
export function loadDailyIntelCache(): DailyIntelCache | null {
  try {
    const raw = localStorage.getItem(DAILY_INTEL_STORAGE_KEY);
    if (!raw) return null;
    const parsed: DailyIntelCache = JSON.parse(raw);
    const { dateKey } = getLiveDateTimeInfo();
    if (
      parsed &&
      parsed.dateKey === dateKey &&
      Date.now() - parsed.timestamp < 4 * 60 * 60 * 1000 &&
      parsed.summary
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves today's auto-updated intelligence briefing to browser storage.
 */
export function saveDailyIntelCache(summary: string): void {
  try {
    const { dateKey } = getLiveDateTimeInfo();
    const payload: DailyIntelCache = {
      dateKey,
      timestamp: Date.now(),
      summary,
    };
    localStorage.setItem(DAILY_INTEL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Loads conversation history from browser localStorage.
 */
export function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m) => m && typeof m.text === "string" && m.text.trim().length > 0)
      .map((m) => ({
        id: m.id || String(Date.now()),
        sender: m.sender === "user" ? "user" : "muskan",
        text: m.text.trim(),
        timestamp: m.timestamp || Date.now(),
      }));
  } catch {
    return [];
  }
}

/**
 * Saves conversation history to browser localStorage (keeps up to 80 clean turns).
 */
export function saveChatHistory(messages: ChatMessage[]): void {
  try {
    const trimmed = messages.slice(-80);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
    updatePersistentNotesFromHistory(trimmed);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Appends or merges a message chunk into the conversation list.
 */
export function appendOrMergeMessage(
  prev: ChatMessage[],
  sender: "user" | "muskan",
  text: string,
  mergeStreaming: boolean = false,
): ChatMessage[] {
  const cleaned = text.trim();
  if (!cleaned) return prev;

  const now = Date.now();
  if (mergeStreaming && prev.length > 0) {
    const last = prev[prev.length - 1];
    if (last.sender === sender && now - last.timestamp < 8000) {
      const separator =
        last.text.endsWith(" ") || cleaned.startsWith(" ") ? "" : " ";
      const updatedLast: ChatMessage = {
        ...last,
        text: `${last.text}${separator}${cleaned}`.replace(/\s+/g, " ").trim(),
        timestamp: now,
      };
      return [...prev.slice(0, -1), updatedLast];
    }
  }

  return [
    ...prev,
    {
      id: `${now}-${sender}-${Math.random().toString(36).slice(2, 6)}`,
      sender,
      text: cleaned,
      timestamp: now,
    },
  ];
}

function updatePersistentNotesFromHistory(messages: ChatMessage[]): void {
  try {
    const existingRaw = localStorage.getItem(NOTES_STORAGE_KEY);
    let notes: string[] = existingRaw ? JSON.parse(existingRaw) : [];
    if (!Array.isArray(notes)) notes = [];

    const userMessages = messages.filter((m) => m.sender === "user");
    for (const msg of userMessages.slice(-8)) {
      const t = msg.text.trim();
      if (t.length > 8 && !notes.includes(t)) {
        notes.push(t);
      }
    }

    const trimmedNotes = notes.slice(-25);
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(trimmedNotes));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Builds a fast, compact memory + daily auto-updated intelligence block from browser localStorage.
 */
export function buildBrowserMemoryContext(messages?: ChatMessage[]): string {
  const history = messages || loadChatHistory();
  const dailyIntel = loadDailyIntelCache();
  let notes: string[] = [];
  try {
    const rawNotes = localStorage.getItem(NOTES_STORAGE_KEY);
    if (rawNotes) {
      const parsed = JSON.parse(rawNotes);
      if (Array.isArray(parsed)) notes = parsed;
    }
  } catch {
    notes = [];
  }

  const dailyIntelSection = dailyIntel?.summary
    ? `\n=== DAILY 2026 BRIEFING (${dailyIntel.dateKey}) ===\n${dailyIntel.summary}\n`
    : "";

  if (history.length === 0 && notes.length === 0) {
    return `${dailyIntelSection}Fresh session.`;
  }

  const recentTurns = history
    .slice(-10)
    .map(
      (m) =>
        `${m.sender === "user" ? "Khaleel Boss" : "Muskan"}: ${m.text.slice(0, 180)}`,
    )
    .join("\n");

  const keyTopics =
    notes.length > 0
      ? `\nPast Topics:\n- ${notes.slice(-8).join("\n- ")}`
      : "";

  return `${dailyIntelSection}=== BROWSER MEMORY ===${keyTopics}\nRecent Chat:\n${recentTurns}`;
}

/**
 * Clears all stored conversation and notes in browser localStorage.
 */
export function clearAllBrowserMemory(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    localStorage.removeItem(NOTES_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
