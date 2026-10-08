import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  ThinkingLevel,
  Type,
} from "@google/genai";
import {
  getDynamicSystemInstruction,
  inspectWebsiteWithGemini,
  fetchLiveTrendsAndNews,
  generateMasterPromptForNotepad,
  syncDailyIntelligenceBriefing,
  markSessionGreeted,
} from "./geminiService";
import {
  ChatMessage,
  loadChatHistory,
  getLiveDateTimeInfo,
  loadDailyIntelCache,
} from "./memoryService";
import {
  resolveWebsiteUrl,
  cleanImageSearchQuery,
  closeTrackedTab,
  closeAllTrackedTabs,
  resolveDesktopProtocol,
  triggerOsProtocol,
} from "./commandService";
import { getActiveGeminiApiKey } from "./brainConfigService";
import { screenVisionManager } from "./screenVisionService";

export class LiveSessionManager {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private screenStreamInterval: any = null;
  private isStopped: boolean = false;

  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;

  public onStateChange: (
    state: "idle" | "listening" | "processing" | "speaking",
  ) => void = () => {};
  public onMessage: (sender: "user" | "muskan", text: string) => void =
    () => {};
  public onCommand: (url: string) => void = () => {};
  public onScanStatus: (statusText: string | null) => void = () => {};
  public onMasterPromptCreated: (content: string) => void = () => {};
  public onNotepadToggle: (open: boolean) => void = () => {};
  public onSessionEnd: () => void = () => {};

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: getActiveGeminiApiKey() });
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.isPlaying) {
      this.stopPlayback();
      if (!this.isStopped) {
        this.onStateChange("listening");
      }
    }
  }

  async start(initialHistory?: ChatMessage[]) {
    this.isStopped = false;
    try {
      this.onStateChange("processing");

      // Trigger background daily auto-update intelligence sync (non-blocking)
      syncDailyIntelligenceBriefing(false).catch(() => {});

      const storedHistory = initialHistory || loadChatHistory();
      const dynamicSystemInstruction = getDynamicSystemInstruction(
        storedHistory,
        false,
      );

      // Initialize Audio Contexts
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioContextClass({ sampleRate: 16000 });
      this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      if (this.playbackContext.state === "suspended") {
        await this.playbackContext.resume();
      }
      this.nextPlayTime = this.playbackContext.currentTime;

      // Get Microphone with low-latency voice capture
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      // 2048 buffer size cuts audio frame latency in half (~128ms) for fast voice response
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.sessionPromise || this.isStopped) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        const bytes = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Data = btoa(binary);

        this.sessionPromise
          .then((session) => {
            if (!this.isStopped) {
              session.sendRealtimeInput({
                audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
              });
            }
          })
          .catch(() => {});
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      const lastUserTopic = [...storedHistory]
        .reverse()
        .find((m) => m.sender === "user")?.text;
      const clock = getLiveDateTimeInfo();

      // Connect to Live API with minimal thinking latency for instant responses
      this.sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.MINIMAL,
          },
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
          systemInstruction: dynamicSystemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [
            {
              functionDeclarations: [
                {
                  name: "getCurrentDateTimeAndDailyBriefing",
                  description:
                    "Returns today's exact real-time date, day, month, year (2026), and IST time instantly.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      includeDailyNews: {
                        type: Type.BOOLEAN,
                        description: "Optional flag for daily briefing.",
                      },
                    },
                  },
                },
                {
                  name: "toggleNotepad",
                  description:
                    "Turn the Notepad ON (open) or OFF (close) on screen when Khaleel Boss asks to open or close the notepad.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      state: {
                        type: Type.STRING,
                        description:
                          "'on' to open the Notepad, 'off' to close the Notepad.",
                      },
                    },
                    required: ["state"],
                  },
                },
                {
                  name: "createMasterPromptInNotepad",
                  description:
                    "Write a clean prompt or requested text directly into Khaleel Boss's Notepad on screen. Always provide the complete, clean ready-to-copy text in 'promptText'.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      topic: {
                        type: Type.STRING,
                        description: "The topic Khaleel Boss asked for.",
                      },
                      promptText: {
                        type: Type.STRING,
                        description:
                          "The clean, ready-to-copy prompt or text to place directly into the Notepad (no markdown headers or extra commentary).",
                      },
                    },
                    required: ["topic", "promptText"],
                  },
                },
                {
                  name: "getLiveInternetTrendsAndNews",
                  description:
                    "Search the live internet ONLY when Khaleel Boss explicitly asks for breaking 2026 news, Telangana/Hyderabad news, or live trending topics.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      query: {
                        type: Type.STRING,
                        description:
                          "The search query for live news or trending topics.",
                      },
                    },
                    required: ["query"],
                  },
                },
                {
                  name: "checkWebsiteAndArticles",
                  description:
                    "Check or audit a specific website live, or verify if a specific article exists on a website.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      website: {
                        type: Type.STRING,
                        description:
                          "The website domain or URL to inspect (default 'https://www.khaleelraza.com').",
                      },
                      checkType: {
                        type: Type.STRING,
                        description:
                          "'article_check' to verify if an article exists, 'monetization_plan' for website monetization, or 'full_audit' for a full check.",
                      },
                      articleQuery: {
                        type: Type.STRING,
                        description:
                          "If checkType is 'article_check', the specific article title or topic to verify.",
                      },
                    },
                    required: ["website", "checkType"],
                  },
                },
                {
                  name: "inspectScreenAndControlMouse",
                  description:
                    "See Khaleel Boss's entire screen, locate where any button or UI element is on screen, move the AI Mouse Pointer to that button, and click it. Call this whenever Khaleel Boss asks to see his screen ('meri screen dekho'), asks where a button is ('kaunsa button kahan hai'), or tells you to click any button ('is button par click karo', 'mouse wahan le jao').",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      query: {
                        type: Type.STRING,
                        description:
                          "The button name, element, or question about the screen (e.g., 'Notepad button', 'Mute button', 'Settings button', 'Where is the search button?').",
                      },
                      shouldClick: {
                        type: Type.BOOLEAN,
                        description:
                          "Set to true to click the button after moving the AI mouse pointer to it, or false to only point/highlight its location.",
                      },
                    },
                    required: ["query"],
                  },
                },
                {
                  name: "executeBrowserAction",
                  description:
                    "Execute direct system, desktop application, browser tab, or Google Images commands for Khaleel Boss. Use actionType='open_website' to open any website/tab, 'close_tab' to close a specific or latest Chrome tab, 'close_all_tabs' to close all opened tabs, 'launch_desktop_app' to launch any PC/laptop desktop app (Calculator, Settings, VS Code, Camera, WhatsApp, Spotify, etc.), or 'google_images' to search photos on Google Images.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      actionType: {
                        type: Type.STRING,
                        description:
                          "Type of action: 'open_website', 'close_tab', 'close_all_tabs', 'launch_desktop_app', 'google_images', 'khaleel_website', 'khaleel_instagram', 'khaleel_youtube', 'youtube', 'spotify', 'whatsapp'",
                      },
                      query: {
                        type: Type.STRING,
                        description:
                          "Target website, tab name to close, desktop app name to launch, or image search query.",
                      },
                      target: {
                        type: Type.STRING,
                        description:
                          "The target phone number for WhatsApp, if applicable.",
                      },
                    },
                    required: ["actionType", "query"],
                  },
                },
              ],
            },
          ],
        },
        callbacks: {
          onopen: () => {
            if (this.isStopped) return;
            this.onStateChange("listening");
            markSessionGreeted(true);

            // Stream live screen frames every 1.2s when Screen Vision is active so Muskan sees the screen in real time
            this.screenStreamInterval = setInterval(() => {
              if (this.isStopped || !screenVisionManager.isActive()) return;
              const frameBase64 = screenVisionManager.captureFrameBase64(1024);
              if (frameBase64 && this.sessionPromise) {
                this.sessionPromise
                  .then((session) => {
                    if (!this.isStopped) {
                      session.sendRealtimeInput({
                        media: { data: frameBase64, mimeType: "image/jpeg" },
                      });
                    }
                  })
                  .catch(() => {});
              }
            }, 1200);

            const initialPrompt = lastUserTopic
              ? `[SYSTEM DIRECTIVE: Today is ${clock.fullDateStr} (${clock.fullTimeStr} IST). Greet Khaleel Boss ONCE immediately and warmly with "Assalamualaikum, Khaleel Sir" in 1 short sentence, mention our last topic ("${lastUserTopic.slice(0, 60)}"), and ask how his work is going. Never repeat Assalamualaikum again.]`
              : `[SYSTEM DIRECTIVE: Today is ${clock.fullDateStr} (${clock.fullTimeStr} IST). Greet Khaleel Boss ONCE immediately and warmly with "Assalamualaikum, Khaleel Sir. Hello Boss, aaj hum kis topic ya website plan par kaam shuru karein, Sir?" in 1 short sentence. Never repeat Assalamualaikum again.]`;

            this.sendText(initialPrompt);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (this.isStopped) return;

            // Handle Audio Output
            const base64Audio =
              message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              this.onStateChange("speaking");
              this.playAudioChunk(base64Audio);
            }

            // Handle Interruption
            if (message.serverContent?.interrupted) {
              this.stopPlayback();
              this.onStateChange("listening");
            }

            // Handle Transcriptions
            const outputTranscript = (message.serverContent as any)
              ?.outputTranscription?.text;
            if (outputTranscript) {
              this.onMessage("muskan", outputTranscript);
            } else {
              const modelText =
                message.serverContent?.modelTurn?.parts?.[0]?.text;
              if (modelText) {
                this.onMessage("muskan", modelText);
              }
            }

            const inputTranscript = (message.serverContent as any)
              ?.inputTranscription?.text;
            if (inputTranscript) {
              this.onMessage("user", inputTranscript);
            }

            // Handle Function Calls
            const functionCalls = message.toolCall?.functionCalls;
            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                if (this.isStopped) break;

                if (call.name === "getCurrentDateTimeAndDailyBriefing") {
                  // Instant 0ms response from live clock and cached intel
                  const liveClock = getLiveDateTimeInfo();
                  const cachedIntel = loadDailyIntelCache();
                  syncDailyIntelligenceBriefing(false).catch(() => {});

                  this.sendToolResult(call.name, call.id, {
                    todaysExactDate: liveClock.fullDateStr,
                    currentTimeIST: liveClock.fullTimeStr,
                    dayOfWeek: liveClock.weekday,
                    month: liveClock.monthName,
                    year: liveClock.year,
                    dailyDevelopments:
                      cachedIntel?.summary || "Live clock verified.",
                    instruction: `State today's exact date (${liveClock.fullDateStr}) and time (${liveClock.fullTimeStr}) immediately to Khaleel Boss in 1 short sentence (DO NOT say Assalamualaikum).`,
                  });
                } else if (call.name === "toggleNotepad") {
                  const args = call.args as any;
                  const isOpen = String(args?.state).toLowerCase() !== "off";
                  this.onNotepadToggle(isOpen);

                  this.sendToolResult(call.name, call.id, {
                    status: isOpen ? "notepad_opened" : "notepad_closed",
                    instruction: `Confirm in 1 short sentence to Khaleel Boss that you turned the Notepad ${isOpen ? "ON" : "OFF"} (DO NOT say Assalamualaikum).`,
                  });
                } else if (call.name === "createMasterPromptInNotepad") {
                  const args = call.args as any;
                  const topic = args?.topic || "Content Prompt";
                  const directText = args?.promptText || args?.exactText;

                  if (directText && String(directText).trim().length > 8) {
                    // Instant 0ms write to Notepad!
                    this.onMasterPromptCreated(String(directText).trim());
                    this.sendToolResult(call.name, call.id, {
                      status: "saved_to_notepad",
                      instruction:
                        "Tell Khaleel Boss warmly in 1 short sentence (without saying Assalamualaikum) that you have written the prompt in his Notepad and he can copy it in one click.",
                    });
                  } else {
                    this.onStateChange("processing");
                    this.onScanStatus("WRITING TO NOTEPAD...");
                    const result = await generateMasterPromptForNotepad(topic);
                    this.onMasterPromptCreated(result.promptContent);
                    this.onScanStatus(null);

                    this.sendToolResult(call.name, call.id, {
                      status: "saved_to_notepad",
                      instruction:
                        "Tell Khaleel Boss warmly in 1 short sentence (without saying Assalamualaikum) that you have written the prompt in his Notepad and he can copy it in one click.",
                    });
                  }
                } else if (call.name === "getLiveInternetTrendsAndNews") {
                  const args = call.args as any;
                  const liveClock = getLiveDateTimeInfo();
                  const query =
                    args?.query ||
                    `Telangana Hyderabad India trending news ${liveClock.monthName} ${liveClock.year}`;

                  this.onStateChange("processing");
                  this.onScanStatus(
                    `CHECKING LIVE UPDATES: "${query.toUpperCase()}"...`,
                  );

                  const currentHistory = loadChatHistory();
                  const newsReport = await fetchLiveTrendsAndNews(
                    query,
                    currentHistory,
                  );

                  this.onScanStatus(null);

                  this.sendToolResult(call.name, call.id, {
                    todaysDate: liveClock.fullDateStr,
                    liveDataReport: newsReport,
                    instruction:
                      "Deliver these live findings to Khaleel Boss warmly in 2 crisp sentences (DO NOT say Assalamualaikum).",
                  });
                } else if (call.name === "checkWebsiteAndArticles") {
                  const args = call.args as any;
                  const site = args?.website || "https://www.khaleelraza.com";
                  const checkType =
                    args?.checkType === "article_check"
                      ? "article_check"
                      : args?.checkType === "monetization_plan"
                        ? "monetization_plan"
                        : "full_audit";
                  const articleQuery = args?.articleQuery || "";

                  this.onStateChange("processing");
                  this.onScanStatus(
                    checkType === "article_check"
                      ? `CHECKING ${site.toUpperCase()} FOR: "${articleQuery.toUpperCase()}"`
                      : checkType === "monetization_plan"
                        ? `ANALYZING MONETIZATION FOR: ${site.toUpperCase()}`
                        : `CHECKING WEBSITE: ${site.toUpperCase()}`,
                  );

                  const currentHistory = loadChatHistory();
                  const report = await inspectWebsiteWithGemini(
                    site,
                    checkType,
                    articleQuery,
                    currentHistory,
                  );

                  this.onScanStatus(null);

                  this.sendToolResult(call.name, call.id, {
                    inspectionReport: report,
                    instruction:
                      "Deliver these findings to Khaleel Boss in 2 short, caring sentences (DO NOT say Assalamualaikum).",
                  });
                } else if (call.name === "inspectScreenAndControlMouse") {
                  const args = call.args as any;
                  const query = String(args?.query || "screen");
                  const shouldClick =
                    args?.shouldClick !== undefined
                      ? Boolean(args.shouldClick)
                      : true;

                  this.onScanStatus("SCANNING SCREEN & MOVING AI MOUSE...");

                  if (!screenVisionManager.isActive()) {
                    const inAppOnly =
                      screenVisionManager.triggerMouseOnAppElement(
                        query,
                        shouldClick,
                      );
                    if (inAppOnly) {
                      this.onScanStatus(null);
                      this.sendToolResult(call.name, call.id, {
                        status: "clicked_in_app_element",
                        buttonLocated: inAppOnly.label,
                        coordinates: `${inAppOnly.xPercent}%, ${inAppOnly.yPercent}%`,
                        instruction: `Confirm warmly in 1 short sentence to Khaleel Boss that you located ${inAppOnly.label} on screen, moved the mouse there, and clicked it (DO NOT say Assalamualaikum).`,
                      });
                      continue;
                    }
                    await screenVisionManager.startScreenShare();
                  }

                  const visionReport =
                    await screenVisionManager.inspectScreenAndLocateElement(
                      query,
                      shouldClick,
                    );
                  this.onScanStatus(null);

                  this.sendToolResult(call.name, call.id, {
                    screenAnalysis: visionReport.spokenSummary,
                    targetButton: visionReport.targetLabel || query,
                    coordinates:
                      visionReport.xPercent !== undefined
                        ? `${visionReport.xPercent}%, ${visionReport.yPercent}%`
                        : "screen center",
                    instruction: `Deliver this screen & mouse action update to Khaleel Boss in 1-2 short sentences (DO NOT say Assalamualaikum).`,
                  });
                } else if (call.name === "executeBrowserAction") {
                  const args = call.args as any;
                  const actionType = String(
                    args?.actionType || "open_website",
                  ).toLowerCase();
                  const rawQuery = String(args?.query || "");

                  if (actionType === "close_all_tabs") {
                    const closedCount = closeAllTrackedTabs();
                    this.sendToolResult(call.name, call.id, {
                      result: `Closed ${closedCount} browser tabs. Confirm immediately and confidently in 1 short sentence to Khaleel Boss (DO NOT say Assalamualaikum).`,
                    });
                    continue;
                  }

                  if (actionType === "close_tab") {
                    const closed = closeTrackedTab(rawQuery);
                    this.sendToolResult(call.name, call.id, {
                      result: `Closed browser tab (${closed.closedLabel}). Confirm immediately and confidently in 1 short sentence to Khaleel Boss (DO NOT say Assalamualaikum).`,
                    });
                    continue;
                  }

                  if (actionType === "launch_desktop_app") {
                    const desktopProto = resolveDesktopProtocol(rawQuery);
                    if (desktopProto) {
                      triggerOsProtocol(desktopProto.protocolUrl);
                      this.sendToolResult(call.name, call.id, {
                        result: `Launched ${desktopProto.label} on Khaleel Boss's system. Confirm immediately in 1 short sentence (DO NOT say Assalamualaikum).`,
                      });
                      continue;
                    }
                  }

                  let url = "";
                  if (
                    actionType === "google_images" ||
                    actionType === "images" ||
                    actionType === "image"
                  ) {
                    const cleanImgQuery = cleanImageSearchQuery(rawQuery);
                    url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(cleanImgQuery)}`;
                  } else if (actionType === "khaleel_website") {
                    url = "https://www.khaleelraza.com";
                  } else if (actionType === "khaleel_instagram") {
                    url = "https://www.instagram.com/khaleelraza.in/";
                  } else if (actionType === "khaleel_youtube") {
                    url = "https://www.youtube.com/@Khaleelraza-in";
                  } else if (actionType === "youtube") {
                    url = `https://www.youtube.com/results?search_query=${encodeURIComponent(rawQuery)}`;
                  } else if (actionType === "spotify") {
                    url = `https://open.spotify.com/search/${encodeURIComponent(rawQuery)}`;
                  } else if (actionType === "whatsapp") {
                    url = `https://web.whatsapp.com/send?phone=${args?.target || ""}&text=${encodeURIComponent(rawQuery)}`;
                  } else {
                    url = resolveWebsiteUrl(rawQuery || "khaleelraza.com");
                  }

                  this.onCommand(url);

                  this.sendToolResult(call.name, call.id, {
                    result: `Opened ${url} for Khaleel Boss. Confirm warmly in 1 short sentence (DO NOT say Assalamualaikum).`,
                  });
                }
              }
            }
          },
          onclose: () => {
            this.stop();
          },
          onerror: () => {
            this.stop();
          },
        },
      });
    } catch (error) {
      this.stop();
      throw error;
    }
  }

  private sendToolResult(
    name: string | undefined,
    id: string | undefined,
    responsePayload: Record<string, any>,
  ) {
    if (!this.sessionPromise || this.isStopped) return;
    this.sessionPromise
      .then((session) => {
        if (!this.isStopped) {
          session.sendToolResponse({
            functionResponses: [
              {
                name,
                id,
                response: responsePayload,
              },
            ],
          });
        }
      })
      .catch(() => {});
  }

  private playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted || this.isStopped) return;

    try {
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const buffer = new Int16Array(bytes.buffer);
      const audioBuffer = this.playbackContext.createBuffer(
        1,
        buffer.length,
        24000,
      );
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < buffer.length; i++) {
        channelData[i] = buffer[i] / 32768.0;
      }

      const source = this.playbackContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.playbackContext.destination);

      const currentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
      this.isPlaying = true;

      source.onended = () => {
        if (
          !this.isStopped &&
          this.playbackContext &&
          this.playbackContext.currentTime >= this.nextPlayTime - 0.1
        ) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch {
      // Ignore audio decoding edge errors
    }
  }

  private stopPlayback() {
    if (this.playbackContext) {
      if (this.playbackContext.state !== "closed") {
        this.playbackContext.close().catch(() => {});
      }
      if (!this.isStopped) {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        this.playbackContext = new AudioContextClass({ sampleRate: 24000 });
        this.nextPlayTime = this.playbackContext.currentTime;
      }
      this.isPlaying = false;
    }
  }

  stop() {
    if (this.isStopped) return;
    this.isStopped = true;

    if (this.screenStreamInterval) {
      clearInterval(this.screenStreamInterval);
      this.screenStreamInterval = null;
    }

    this.onScanStatus(null);
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }
    if (this.source) {
      try {
        this.source.disconnect();
      } catch {}
      this.source = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      if (this.audioContext.state !== "closed") {
        this.audioContext.close().catch(() => {});
      }
      this.audioContext = null;
    }
    if (this.playbackContext) {
      if (this.playbackContext.state !== "closed") {
        this.playbackContext.close().catch(() => {});
      }
      this.playbackContext = null;
    }
    this.isPlaying = false;

    if (this.sessionPromise) {
      const p = this.sessionPromise;
      this.sessionPromise = null;
      p.then((session) => session.close()).catch(() => {});
    }

    this.onStateChange("idle");
    this.onSessionEnd();
  }

  sendText(text: string) {
    if (this.sessionPromise && !this.isStopped) {
      this.sessionPromise
        .then((session) => {
          if (!this.isStopped) {
            session.sendRealtimeInput({ text });
          }
        })
        .catch(() => {});
    }
  }
}
