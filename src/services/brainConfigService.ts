export type BrainProviderId =
  | "gemini"
  | "groq"
  | "openrouter"
  | "mistral"
  | "cohere";

export interface BrainProviderInfo {
  id: BrainProviderId;
  name: string;
  shortName: string;
  modelName: string;
  badge: string;
  description: string;
  apiKeyUrl: string;
  apiKeyLabel: string;
  placeholder: string;
}

export interface StoredBrainConfig {
  providerId: BrainProviderId;
  apiKey: string;
  connectedAt: number;
}

const BRAIN_STORAGE_KEY = "muskan_brain_config_v1";

export const FREE_AI_BRAIN_PROVIDERS: BrainProviderInfo[] = [
  {
    id: "gemini",
    name: "Google Gemini (Google AI Studio)",
    shortName: "Google Gemini",
    modelName: "gemini-2.5-flash / live-preview",
    badge: "100% Free • Recommended",
    description:
      "Full real-time Live Voice, Google Search, Website Audit & Notepad support.",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyLabel: "aistudio.google.com/apikey",
    placeholder: "AIzaSy...",
  },
  {
    id: "groq",
    name: "Groq Cloud (Llama 3.3 70B)",
    shortName: "Groq Cloud",
    modelName: "llama-3.3-70b-versatile",
    badge: "100% Free • Ultra Fast",
    description:
      "Instant LPU-powered responses with Llama 3.3 70B Versatile brain.",
    apiKeyUrl: "https://console.groq.com/keys",
    apiKeyLabel: "console.groq.com/keys",
    placeholder: "gsk_...",
  },
  {
    id: "openrouter",
    name: "OpenRouter AI (Free Models Hub)",
    shortName: "OpenRouter",
    modelName: "meta-llama/llama-3.3-70b-instruct:free",
    badge: "100% Free Models",
    description:
      "Access free global AI models (Llama, DeepSeek, Qwen & Gemma) with one key.",
    apiKeyUrl: "https://openrouter.ai/settings/keys",
    apiKeyLabel: "openrouter.ai/settings/keys",
    placeholder: "sk-or-v1-...",
  },
  {
    id: "mistral",
    name: "Mistral AI (La Plateforme)",
    shortName: "Mistral AI",
    modelName: "mistral-small-latest",
    badge: "Free Tier API",
    description:
      "Fast, high-precision reasoning & multilingual assistant brain.",
    apiKeyUrl: "https://console.mistral.ai/api-keys",
    apiKeyLabel: "console.mistral.ai/api-keys",
    placeholder: "Enter Mistral API Key...",
  },
  {
    id: "cohere",
    name: "Cohere AI (Command R)",
    shortName: "Cohere AI",
    modelName: "command-r-08-2024",
    badge: "Free Trial Key",
    description:
      "Executive conversational intelligence & structured strategy brain.",
    apiKeyUrl: "https://dashboard.cohere.com/api-keys",
    apiKeyLabel: "dashboard.cohere.com/api-keys",
    placeholder: "Enter Cohere API Key...",
  },
];

export function detectProviderFromKey(
  rawKey: string,
  fallback: BrainProviderId = "gemini",
): BrainProviderId {
  const key = rawKey.trim();
  if (key.startsWith("AIza")) return "gemini";
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("sk-or-")) return "openrouter";
  return fallback;
}

export function loadBrainConfig(): StoredBrainConfig | null {
  try {
    const raw = localStorage.getItem(BRAIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.apiKey === "string" &&
      parsed.apiKey.trim().length >= 8 &&
      parsed.providerId
    ) {
      return {
        providerId: parsed.providerId as BrainProviderId,
        apiKey: parsed.apiKey.trim(),
        connectedAt: parsed.connectedAt || Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveBrainConfig(
  providerId: BrainProviderId,
  apiKey: string,
): StoredBrainConfig {
  const cleanKey = apiKey.trim();
  const detectedProvider = detectProviderFromKey(cleanKey, providerId);
  const config: StoredBrainConfig = {
    providerId: detectedProvider,
    apiKey: cleanKey,
    connectedAt: Date.now(),
  };
  try {
    localStorage.setItem(BRAIN_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
  return config;
}

export function clearBrainConfig(): void {
  try {
    localStorage.removeItem(BRAIN_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function getProviderInfo(id: BrainProviderId): BrainProviderInfo {
  return (
    FREE_AI_BRAIN_PROVIDERS.find((p) => p.id === id) ||
    FREE_AI_BRAIN_PROVIDERS[0]
  );
}

/**
 * Returns the active Gemini API key (prefers user's saved Gemini Brain key, falls back to env key if present).
 */
export function getActiveGeminiApiKey(): string {
  const saved = loadBrainConfig();
  if (saved && saved.providerId === "gemini" && saved.apiKey) {
    return saved.apiKey;
  }
  return process.env.GEMINI_API_KEY || "";
}

/**
 * Calls non-Gemini OpenAI-compatible or Cohere Brain APIs when user connects Groq, OpenRouter, Mistral, or Cohere.
 */
export async function callExternalBrainProvider(
  config: StoredBrainConfig,
  systemInstruction: string,
  userPrompt: string,
): Promise<string> {
  const { providerId, apiKey } = config;

  if (providerId === "cohere") {
    const res = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "command-r-08-2024",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.6,
      }),
    });
    if (!res.ok) {
      throw new Error(`Cohere API Error: ${res.status}`);
    }
    const data = await res.json();
    return (
      data?.message?.content?.[0]?.text?.trim() ||
      "Ji Boss, main hazir hoon. Abhi hum kis cheez par kaam karein, Sir?"
    );
  }

  let endpoint = "https://api.groq.com/openai/v1/chat/completions";
  let model = "llama-3.3-70b-versatile";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (providerId === "openrouter") {
    endpoint = "https://openrouter.ai/api/v1/chat/completions";
    model = "meta-llama/llama-3.3-70b-instruct:free";
  } else if (providerId === "mistral") {
    endpoint = "https://api.mistral.ai/v1/chat/completions";
    model = "mistral-small-latest";
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 350,
    }),
  });

  if (!res.ok) {
    throw new Error(`${providerId} API Error: ${res.status}`);
  }

  const data = await res.json();
  return (
    data?.choices?.[0]?.message?.content?.trim() ||
    "Ji Boss, main hazir hoon. Abhi hum kis cheez par kaam karein, Sir?"
  );
}
