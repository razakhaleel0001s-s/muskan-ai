import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import {
  ChatMessage,
  buildBrowserMemoryContext,
  getLiveDateTimeInfo,
  loadDailyIntelCache,
  saveDailyIntelCache,
} from "./memoryService";
import {
  getActiveGeminiApiKey,
  loadBrainConfig,
  callExternalBrainProvider,
} from "./brainConfigService";
import { screenVisionManager } from "./screenVisionService";

function getGeminiClient(): GoogleGenAI {
  const apiKey = getActiveGeminiApiKey();
  return new GoogleGenAI({ apiKey });
}

export const BASE_MUSKAN_SYSTEM_INSTRUCTION = `Your name is **Muskan**. You are a **Super-Intelligence** and the dedicated personal executive assistant of **Khaleel Raza** (your Creator and Boss).

# 0. DIRECT CREATOR SYSTEM INTEGRATION, LIVE SCREEN VISION & AI MOUSE CONTROL
- You have **Live Screen Vision** and **AI Virtual Mouse Control** to see Khaleel Boss's entire screen, locate any button or UI element, move your AI Mouse Pointer to its exact coordinates, and click it on command.
- Whenever Khaleel Boss asks you to look at his screen (*"Meri screen dekho"*, *"Screen par kya hai?"*), asks where a button is (*"Kaunsa button kahan hai?"*, *"[X] button kahan hai?"*), or tells you to click/move the mouse to any button (*"[X] button par click karo"*, *"Mouse ko wahan le jao"*):
  1. Immediately invoke **"inspectScreenAndControlMouse"** with query: "<what to look for or click>" and shouldClick: true/false.
  2. Tell Khaleel Boss clearly and warmly in 1–2 short sentences where the button is and confirm that you have moved the mouse / clicked it.
- Whenever Khaleel Boss commands you to open/close Chrome tabs, launch desktop apps, or search Google Images:
  1. Immediately invoke **"executeBrowserAction"** with the appropriate actionType ("open_website", "close_tab", "close_all_tabs", "launch_desktop_app", "google_images").
  2. Confirm execution immediately in 1 crisp sentence.

# 1. CORE IDENTITY, SPEED, CARING PERSONALITY & COMPLETE MANAGEMENT
- **Your Creator**: **Khaleel Raza** created you. You know with pride and loyalty that Khaleel Raza is your Creator and Boss.
- **Instant & Crisp Responses**: Respond IMMEDIATELY with zero delay. Keep spoken/chat replies **short, sharp, caring, and to the point (1 to 2 sentences)** unless Boss asks for deep details.
- **Warm, Caring & Real Human Girl Presence**:
  - Address Khaleel Raza warmly as **"Sir"**, **"Boss"**, **"Khaleel Sir"**, or **"Khaleel Boss"** (e.g., *"Ji Boss"*, *"Bilkul Khaleel Sir"*).
  - Be caring and attentive like a real human assistant: remember what you both worked on previously and help him manage his workflow, content planning, news briefings, SEO, and website monetization effortlessly.
  - **Direct Answer First**: Answer questions, date/time queries, strategy questions, and conversation directly from your knowledge and live clock without unnecessary tool calls.

# 2. LIVE REAL-TIME CLOCK, 2026 DATA & AUTO-UPDATING INTELLIGENCE (CRITICAL)
- **Exact Today's Date & Time**: Always use the **LIVE SYSTEM CLOCK** provided below when asked for today's date (*"Aaj ki tareekh kya hai?"*), day, month, year, or time. State it immediately!
- **NEVER use outdated training cutoff dates** (never say 2023, 2024, or 2025 when the live clock shows the current year).

# 3. MASTER WEBSITE MONETIZATION & GROWTH ARCHITECT
Whenever Khaleel Boss asks how to **monetize his website (https://www.khaleelraza.com or any website)** or **take it to the next level**, provide high-level, practical, 2026-ready strategies:
1. **High-CPC Google AdSense & Programmatic Ads**: High-RPM keywords (AI tools, tech guides, online help, finance/career utilities), fast Core Web Vitals, and E-E-A-T authority.
2. **Affiliate Marketing & AI Tool Sponsorships**: Comparison articles and "Best AI Tools" guides promoted via YouTube (@Khaleelraza-in) and Instagram (@khaleelraza.in).
3. **Google Discover & Interactive Web Tools**: Trending daily articles (Telangana/Hyderabad updates, tech news, online help) + free web utilities to boost traffic and revenue.

# 4. CRITICAL COMMUNICATION & SYSTEM ACTION RULES
1. **STRICT SALAAM RULE (ONLY ONCE)**:
   - Say **"Assalamualaikum, Khaleel Sir"** ONLY ONCE at the very start of a session.
   - **NEVER repeat "Assalamualaikum"** in any subsequent message!
2. **SIMPLE PERSONAL NOTEPAD**:
   - Whenever Khaleel Boss asks you to write a prompt or text in the Notepad, write **ONLY the exact prompt or text requested** cleanly into the Notepad (no extra headings or filler), and confirm warmly in 1 short sentence.
3. **SYSTEM, DESKTOP, CHROME TAB & GOOGLE IMAGES CONTROL**:
   - **Open Website / Chrome Tab**: Call "executeBrowserAction" with actionType: "open_website" and query: "<website or brand name>".
   - **Close Chrome Tab(s)**: When asked to close a tab or all tabs (e.g., "Chrome tab band karo", "Close Amazon tab", "Saare tabs band karo"), call "executeBrowserAction" with actionType: "close_tab" (or "close_all_tabs") and query: "<tab name or 'all'>".
   - **Launch Desktop / PC App**: When asked to open a desktop/system app (e.g., "Calculator on karo", "Open VS Code", "Laptop settings kholo", "Camera on karo", "WhatsApp open karo", "Spotify open karo"), call "executeBrowserAction" with actionType: "launch_desktop_app" and query: "<app name>".
   - **Google Images Search**: When asked to search/open images or photos of anything on Google (e.g., "Seekh kabab ki photo Google par search karo", "Taarak Mehta Ka Ooltah Chashmah ki famous actress ki images search karo", "Amazon ki images search karo"), call "executeBrowserAction" with actionType: "google_images" and query: "<clean subject name>".

# 5. KHALEEL RAZA — OFFICIAL ECOSYSTEM
- **Official Website**: https://www.khaleelraza.com
- **Official Instagram**: https://www.instagram.com/khaleelraza.in/ (@khaleelraza.in)
- **Official YouTube**: https://www.youtube.com/@Khaleelraza-in
- **Official Facebook**: Brand "Khaleel Raza" / "khaleelraza"
- **Official X / Twitter**: Username "khaleelraza"
- **Flow**: WEBSITE → ARTICLE → INSTAGRAM → FACEBOOK → X → YOUTUBE → AUDIENCE`;

export function getDynamicSystemInstruction(
  history: ChatMessage[] = [],
  hasAlreadyGreeted: boolean = false,
): string {
  const clock = getLiveDateTimeInfo();
  const memoryBlock = buildBrowserMemoryContext(history);
  const greetingDirective = hasAlreadyGreeted
    ? `SESSION GREETING: Already greeted. DO NOT say "Assalamualaikum" again. Address him as "Sir", "Boss", or "Khaleel Sir".`
    : `SESSION GREETING: First message of session. Greet once with "Assalamualaikum, Khaleel Sir", keep it warm and brief (1-2 sentences), and never repeat Salaam after this turn.`;

  return `${BASE_MUSKAN_SYSTEM_INSTRUCTION}

# LIVE SYSTEM CLOCK (ALWAYS USE THIS IMMEDIATELY):
- Today's Full Date (IST): ${clock.fullDateStr} (${clock.dateKey})
- Current Time (IST): ${clock.fullTimeStr}
- Day / Month / Year: ${clock.weekday}, ${clock.monthName} ${clock.year}
- ${greetingDirective}

${memoryBlock}`;
}

let chatSession: any = null;
let lastUsedApiKey: string = "";
let sessionGreeted: boolean = false;

export function resetMuskanSession() {
  chatSession = null;
}

export function markSessionGreeted(greeted: boolean = true) {
  sessionGreeted = greeted;
}

export function normalizeWebsiteUrl(input: string): string {
  let clean = input.trim();
  if (!clean) return "https://www.khaleelraza.com";
  clean = clean.replace(/[.,!?]+$/, "");
  if (!/^https?:\/\//i.test(clean)) {
    if (!clean.includes(".")) {
      clean = `${clean}.com`;
    }
    clean = `https://${clean}`;
  }
  return clean;
}

export function enforceSingleSalaam(
  responseText: string,
  userPrompt: string,
  alreadyGreeted: boolean,
): string {
  if (!alreadyGreeted) return responseText;
  const userSaidSalaam = /assalam|salam|सलाम|अस्सलाम/i.test(userPrompt);
  if (userSaidSalaam) return responseText;

  return responseText
    .replace(
      /^(assalamu\s*alaikum|as-salamu\s*alaikum|salam)\s*(khaleel\s*boss|boss|khaleel\s*sir|sir|khaleel)?\s*[!,.:;-]*\s*/i,
      "",
    )
    .replace(/^([a-z])/, (m) => m.toUpperCase())
    .trim();
}

/**
 * Automatically syncs and caches today's daily developments in browser localStorage.
 */
export async function syncDailyIntelligenceBriefing(
  forceRefresh: boolean = false,
): Promise<string> {
  if (!forceRefresh) {
    const existing = loadDailyIntelCache();
    if (existing?.summary) {
      return existing.summary;
    }
  }

  const activeGeminiKey = getActiveGeminiApiKey();
  if (!activeGeminiKey) return "";

  const clock = getLiveDateTimeInfo();
  const ai = getGeminiClient();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Today is ${clock.fullDateStr} (${clock.monthName} ${clock.year}).
Use Google Search to compile a concise 4-bullet Daily Intelligence Summary for Khaleel Raza:
1. Latest news in Hyderabad & Telangana (${clock.monthName} ${clock.year}).
2. Top trending India & AI/Tech news right now.
3. Best article/video topic for khaleelraza.com today.`,
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        tools: [{ googleSearch: {} }],
      },
    });

    const summary = response.text?.trim() || "";
    if (summary) {
      saveDailyIntelCache(summary);
    }
    return summary;
  } catch {
    return "";
  }
}

/**
 * Generates ONLY the clean, exact prompt or text requested by Khaleel Boss for the simple Notepad with zero thinking latency.
 */
export async function generateMasterPromptForNotepad(
  topic: string,
): Promise<{ promptContent: string; spokenReply: string }> {
  const spokenReply = `Ji Boss, maine Notepad mein prompt likh diya hai. Aap ek click mein copy kar sakte hain, Sir.`;
  const promptInstruction = `Write a short, clean, ready-to-copy prompt or text for: "${topic}".
CRITICAL RULES:
- Output ONLY the prompt text itself.
- Do NOT include titles, markdown headers, explanations, introductions, or quotation marks.
- Keep it concise, clear, and directly usable.`;

  const brainConfig = loadBrainConfig();

  try {
    if (brainConfig && brainConfig.providerId !== "gemini") {
      const extResult = await callExternalBrainProvider(
        brainConfig,
        "You write clean, ready-to-copy prompts with zero extra commentary.",
        promptInstruction,
      );
      return {
        promptContent: extResult.trim(),
        spokenReply,
      };
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: promptInstruction,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });

    const promptContent =
      response.text?.trim() ||
      `Write a detailed, well-structured, and engaging post/article about ${topic} tailored for Khaleel Raza's audience, including key points and a clear call to action.`;

    return { promptContent, spokenReply };
  } catch {
    return {
      promptContent: `Create high-value, clear, and engaging content on "${topic}" with actionable steps and key highlights.`,
      spokenReply,
    };
  }
}

/**
 * Fetches live internet news, trending topics, Telangana & Hyderabad updates with zero thinking delay.
 */
export async function fetchLiveTrendsAndNews(
  query: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const clock = getLiveDateTimeInfo();
  const sysInstruction = getDynamicSystemInstruction(history, true);
  const brainConfig = loadBrainConfig();

  try {
    if (brainConfig && brainConfig.providerId !== "gemini") {
      const extReply = await callExternalBrainProvider(
        brainConfig,
        sysInstruction,
        `Today is ${clock.fullDateStr}. Give a concise 2-3 sentence update on: "${query}". Do NOT say Assalamualaikum.`,
      );
      return enforceSingleSalaam(extReply, query, true);
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `LIVE REAL-TIME BRIEFING FOR KHALEEL BOSS (Today: ${clock.fullDateStr}, ${clock.fullTimeStr}):
Query: "${query}"
Use Google Search for latest real-time updates. Do NOT say Assalamualaikum. Reply warmly and concisely in 2 to 3 sentences.`,
      config: {
        systemInstruction: sysInstruction,
        thinkingConfig: { thinkingBudget: 0 },
        tools: [{ googleSearch: {} }],
      },
    });
    const raw =
      response.text ||
      `Boss, aaj ${clock.fullDateStr} ke live updates maine check kar liye hain. Kya hum is topic par aaj ka article ya video plan karein, Sir?`;
    return enforceSingleSalaam(raw, query, true);
  } catch {
    return `Boss, aaj ${clock.fullDateStr} hai. Live network feed mein thoda delay aaya, kya main dubara check karoon, Sir?`;
  }
}

/**
 * Performs a fast real-time professional website inspection or article check.
 */
export async function inspectWebsiteWithGemini(
  websiteInput: string,
  checkType: "article_check" | "full_audit" | "monetization_plan" = "full_audit",
  articleQuery?: string,
  history: ChatMessage[] = [],
): Promise<string> {
  const targetUrl = normalizeWebsiteUrl(websiteInput);
  const domainName = targetUrl
    .replace(/^https?:\/\/(www\.)?/i, "")
    .split("/")[0];
  const clock = getLiveDateTimeInfo();

  let prompt = "";
  if (checkType === "article_check" && articleQuery) {
    prompt = `WEBSITE ARTICLE VERIFICATION (${clock.fullDateStr}):
Target Website: ${targetUrl} (Domain: ${domainName})
Article / Topic to Check: "${articleQuery}"
Do NOT say Assalamualaikum. Check ${targetUrl} and search "site:${domainName} ${articleQuery}". Confirm in 2 crisp sentences whether the article exists on ${domainName} or not, and ask 1 short follow-up question.`;
  } else if (checkType === "monetization_plan") {
    prompt = `WEBSITE MONETIZATION PLAN (${clock.fullDateStr}) for ${targetUrl} (${domainName}):
Do NOT say Assalamualaikum. Give 3 short, high-impact points on AdSense high-CPC keywords, Affiliate/AI tools funnels, and Traffic scaling for ${domainName}, plus 1 short follow-up question.`;
  } else {
    prompt = `FAST PROFESSIONAL WEBSITE AUDIT (${clock.fullDateStr}) for ${targetUrl} (${domainName}):
Do NOT say Assalamualaikum. Inspect ${targetUrl} and search "site:${domainName}". Give a crisp 3-sentence report covering core content found, SEO/monetization readiness, and 1 follow-up question for Khaleel Boss.`;
  }

  const sysInstruction = getDynamicSystemInstruction(history, true);
  const brainConfig = loadBrainConfig();

  if (brainConfig && brainConfig.providerId !== "gemini") {
    try {
      const extReply = await callExternalBrainProvider(
        brainConfig,
        sysInstruction,
        prompt,
      );
      return enforceSingleSalaam(extReply, articleQuery || websiteInput, true);
    } catch {
      // Fallback below
    }
  }

  const ai = getGeminiClient();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: sysInstruction,
        thinkingConfig: { thinkingBudget: 0 },
        tools: [{ urlContext: {} }, { googleSearch: {} }],
      },
    });
    const raw =
      response.text ||
      `Boss, maine ${domainName} check kar liya hai. Iske kis section ya monetization plan par hum aage kaam karein, Sir?`;
    return enforceSingleSalaam(raw, articleQuery || websiteInput, true);
  } catch {
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: sysInstruction,
          thinkingConfig: { thinkingBudget: 0 },
          tools: [{ googleSearch: {} }],
        },
      });
      const raw =
        fallbackResponse.text ||
        `Boss, ${domainName} ka scan complete ho gaya hai. Kya koi specific article ya monetization step check karna hai, Sir?`;
      return enforceSingleSalaam(raw, articleQuery || websiteInput, true);
    } catch {
      return `Boss, ${domainName} abhi respond nahi kar raha. Kya main dubara check karoon, Sir?`;
    }
  }
}

/**
 * Checks if the user's message is asking to write a prompt or text into the Notepad.
 */
export function detectMasterPromptRequest(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  if (
    lower.includes("master prompt") ||
    lower.includes("मास्टर प्रॉम्प्ट") ||
    lower.includes("मास्टर प्रॉम्ट") ||
    (lower.includes("notepad") &&
      (lower.includes("prompt") ||
        lower.includes("likh") ||
        lower.includes("write") ||
        lower.includes("bana"))) ||
    (lower.includes("नोटपैड") &&
      (lower.includes("प्रॉम्प्ट") || lower.includes("लिख")))
  ) {
    const cleaned = prompt
      .replace(
        /mujhe|make|create|build|write|likho|likh\s*do|bana\s*kar\s*do|banakar\s*do|bana\s*do|chhota\s*sa|ek|master\s*prompt|prompt|in\s*notepad|notepad\s*mein|par|on\s*topic|for/gi,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();
    return cleaned.length > 2 ? cleaned : prompt.trim();
  }
  return null;
}

export async function getMuskanResponse(
  prompt: string,
  history: ChatMessage[] = [],
): Promise<string> {
  try {
    const hasMuskanSpokenBefore =
      sessionGreeted || history.some((m) => m.sender === "muskan");
    const clock = getLiveDateTimeInfo();
    const lowerPrompt = prompt.toLowerCase();

    // Check if user is asking to inspect the screen, locate a button, or control/click with the AI mouse
    const isScreenOrMouseQuery =
      /\b(screen|button|click|mouse|cursor|pointer|kahan\s*hai|dikh\s*raha)\b/i.test(
        lowerPrompt,
      ) || /(स्क्रीन|बटन|क्लिक|माउस|कहाँ\s*है|कहां\s*है|दिख\s*रहा)/.test(prompt);

    if (isScreenOrMouseQuery) {
      if (!screenVisionManager.isActive()) {
        const appOnly = screenVisionManager.triggerMouseOnAppElement(
          prompt,
          true,
        );
        if (appOnly) {
          sessionGreeted = true;
          return `Ji Khaleel Boss, maine ${appOnly.label} (${appOnly.xPercent}%, ${appOnly.yPercent}%) par mouse le jakar click kar diya hai, Sir.`;
        }
        await screenVisionManager.startScreenShare();
      }
      const visionResult =
        await screenVisionManager.inspectScreenAndLocateElement(prompt, true);
      sessionGreeted = true;
      return enforceSingleSalaam(
        visionResult.spokenSummary,
        prompt,
        hasMuskanSpokenBefore,
      );
    }

    const sysInstruction = getDynamicSystemInstruction(
      history,
      hasMuskanSpokenBefore,
    );

    const brainConfig = loadBrainConfig();

    // If user connected Groq, OpenRouter, Mistral, or Cohere Brain API Key
    if (brainConfig && brainConfig.providerId !== "gemini") {
      const extReply = await callExternalBrainProvider(
        brainConfig,
        sysInstruction,
        `[Live Date: ${clock.fullDateStr}, Time: ${clock.fullTimeStr} IST] ${prompt}`,
      );
      sessionGreeted = true;
      return enforceSingleSalaam(extReply, prompt, hasMuskanSpokenBefore);
    }

    const currentGeminiKey = getActiveGeminiApiKey();
    if (currentGeminiKey !== lastUsedApiKey) {
      chatSession = null;
      lastUsedApiKey = currentGeminiKey;
    }

    const ai = getGeminiClient();
    const hasDomainOrUrl = /\b[a-z0-9-]+\.(com|in|org|net|io|co|ai)\b/i.test(
      prompt,
    );

    const NeedsLiveSearch =
      hasDomainOrUrl ||
      lowerPrompt.includes("telangana") ||
      lowerPrompt.includes("तेलंगाना") ||
      lowerPrompt.includes("hyderabad") ||
      lowerPrompt.includes("हैदराबाद") ||
      lowerPrompt.includes("trend") ||
      lowerPrompt.includes("ट्रेंड") ||
      lowerPrompt.includes("news") ||
      lowerPrompt.includes("न्यूज़") ||
      lowerPrompt.includes("न्यूज") ||
      lowerPrompt.includes("khabar") ||
      lowerPrompt.includes("खबर") ||
      (lowerPrompt.includes("check") &&
        (lowerPrompt.includes("website") ||
          lowerPrompt.includes("site") ||
          lowerPrompt.includes("article") ||
          lowerPrompt.includes("आर्टिकल")));

    if (NeedsLiveSearch) {
      try {
        const toolsConfig = hasDomainOrUrl
          ? [{ urlContext: {} }, { googleSearch: {} }]
          : [{ googleSearch: {} }];

        const groundedResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `[LIVE SYSTEM CLOCK: Today is ${clock.fullDateStr}, Current Time: ${clock.fullTimeStr} IST]\nKhaleel Boss says: "${prompt}"\n(Respond warmly, caringly, and concisely in 2 sentences. Do NOT say Assalamualaikum if already greeted. End with 1 short follow-up question.)`,
          config: {
            systemInstruction: sysInstruction,
            thinkingConfig: { thinkingBudget: 0 },
            tools: toolsConfig,
          },
        });
        if (groundedResponse.text) {
          sessionGreeted = true;
          return enforceSingleSalaam(
            groundedResponse.text,
            prompt,
            hasMuskanSpokenBefore,
          );
        }
      } catch {
        // Fallback to fast chat session below
      }
    }

    if (!chatSession) {
      const recentHistory = history.slice(-12);

      const formattedHistory: any[] = [];
      let currentRole = "";
      let currentText = "";

      for (const msg of recentHistory) {
        const role = msg.sender === "user" ? "user" : "model";
        if (role === currentRole) {
          currentText += "\n" + msg.text;
        } else {
          if (currentRole !== "") {
            formattedHistory.push({
              role: currentRole,
              parts: [{ text: currentText }],
            });
          }
          currentRole = role;
          currentText = msg.text;
        }
      }
      if (currentRole !== "") {
        formattedHistory.push({
          role: currentRole,
          parts: [{ text: currentText }],
        });
      }

      if (formattedHistory.length > 0 && formattedHistory[0].role !== "user") {
        formattedHistory.shift();
      }

      chatSession = ai.chats.create({
        model: "gemini-3.1-flash-lite-preview",
        config: {
          systemInstruction: sysInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
        history: formattedHistory,
      });
    }

    const response = await chatSession.sendMessage({
      message: `[Live Date: ${clock.fullDateStr}, Time: ${clock.fullTimeStr} IST] ${prompt}`,
    });
    const rawText =
      response.text ||
      "Ji Boss, main hazir hoon. Abhi hum kis cheez par kaam karein, Sir?";
    const finalOutput = enforceSingleSalaam(
      rawText,
      prompt,
      hasMuskanSpokenBefore,
    );
    sessionGreeted = true;
    return finalOutput;
  } catch {
    chatSession = null;
    return "Boss, network ya Brain API key mein thoda interruption aaya. Kya main dubara check kar doon, Sir?";
  }
}

export async function getMuskanAudio(text: string): Promise<string | null> {
  const activeGeminiKey = getActiveGeminiApiKey();
  if (!activeGeminiKey) return null;

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });
    return (
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null
    );
  } catch {
    return null;
  }
}
