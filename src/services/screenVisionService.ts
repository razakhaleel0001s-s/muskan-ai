import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { getActiveGeminiApiKey } from "./brainConfigService";

export interface AiMouseAction {
  xPercent: number;
  yPercent: number;
  label: string;
  clicked: boolean;
   timestamp: number;
}

class ScreenVisionManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  public onScreenStateChange: (active: boolean) => void = () => {};
  public onMouseAction: (action: AiMouseAction) => void = () => {};

  public isActive(): boolean {
    return Boolean(this.stream && this.stream.active);
  }

  public getStream(): MediaStream | null {
    return this.stream;
  }

  public async startScreenShare(): Promise<boolean> {
    if (this.isActive()) return true;

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 5, max: 10 },
        },
        audio: false,
      });

      this.stream = mediaStream;

      const video = document.createElement("video");
      video.srcObject = mediaStream;
      video.muted = true;
      video.playsInline = true;
      await video.play().catch(() => {});
      this.videoElement = video;

      const canvas = document.createElement("canvas");
      this.canvasElement = canvas;

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      this.onScreenStateChange(true);
      return true;
    } catch {
      this.stopScreenShare();
      return false;
    }
  }

  public stopScreenShare(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    this.canvasElement = null;
    this.onScreenStateChange(false);
  }

  /**
   * Captures the current shared screen frame as a base64 JPEG string (without data: prefix).
   */
  public captureFrameBase64(maxWidth: number = 1280): string | null {
    if (!this.videoElement || !this.canvasElement || !this.isActive()) {
      return null;
    }

    const vw = this.videoElement.videoWidth;
    const vh = this.videoElement.videoHeight;
    if (!vw || !vh) return null;

    const scale = Math.min(1, maxWidth / vw);
    const cw = Math.round(vw * scale);
    const ch = Math.round(vh * scale);

    this.canvasElement.width = cw;
    this.canvasElement.height = ch;

    const ctx = this.canvasElement.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(this.videoElement, 0, 0, cw, ch);
    const dataUrl = this.canvasElement.toDataURL("image/jpeg", 0.72);
    return dataUrl.split(",")[1] || null;
  }

  /**
   * Moves the virtual AI mouse to an in-app button or coordinate and clicks it if requested.
   */
  public triggerMouseOnAppElement(
    targetQuery: string,
    shouldClick: boolean = true,
  ): {
    foundInApp: boolean;
    label: string;
    xPercent: number;
    yPercent: number;
  } | null {
    const q = targetQuery.toLowerCase().trim();

    // Map common Hindi/English button names to DOM selectors or title attributes
    const candidates = Array.from(
      document.querySelectorAll("button, a, input, textarea"),
    ) as HTMLElement[];

    let matchedEl: HTMLElement | null = null;
    let matchedLabel = "";

    for (const el of candidates) {
      const text = (el.innerText || el.textContent || "").toLowerCase().trim();
      const title = (el.getAttribute("title") || "").toLowerCase().trim();
      const placeholder = (el.getAttribute("placeholder") || "")
        .toLowerCase()
        .trim();
      const combined = `${text} ${title} ${placeholder}`;

      if (
        (q.includes("notepad") || q.includes("नोटपैड")) &&
        combined.includes("notepad")
      ) {
        matchedEl = el;
        matchedLabel = "Notepad Button";
        break;
      }
      if (
        (q.includes("copy") || q.includes("कॉपी")) &&
        combined.includes("copy")
      ) {
        matchedEl = el;
        matchedLabel = "Copy Button";
        break;
      }
      if (
        (q.includes("mute") ||
          q.includes("unmute") ||
          q.includes("volume") ||
          q.includes("sound") ||
          q.includes("आवाज") ||
          q.includes("म्यूट")) &&
        (combined.includes("mute") || combined.includes("audio"))
      ) {
        matchedEl = el;
        matchedLabel = "Mute / Audio Button";
        break;
      }
      if (
        (q.includes("setting") ||
          q.includes("api") ||
          q.includes("brain") ||
          q.includes("सेटिंग")) &&
        combined.includes("settings")
      ) {
        matchedEl = el;
        matchedLabel = "Brain Settings Button";
        break;
      }
      if (
        (q.includes("keyboard") ||
          q.includes("type") ||
          q.includes("message") ||
          q.includes("कीबोर्ड")) &&
        (combined.includes("type a message") || combined.includes("message"))
      ) {
        matchedEl = el;
        matchedLabel = "Keyboard Input Button";
        break;
      }
      if (
        (q.includes("clear") ||
          q.includes("delete") ||
          q.includes("memory") ||
          q.includes("trash")) &&
        combined.includes("clear memory")
      ) {
        matchedEl = el;
        matchedLabel = "Clear Memory Button";
        break;
      }
      if (
        (q.includes("start session") ||
          q.includes("end session") ||
          q.includes("session")) &&
        combined.includes("session")
      ) {
        matchedEl = el;
        matchedLabel = text.toUpperCase() || "Session Button";
        break;
      }
      if (q.length >= 3 && combined.includes(q)) {
        matchedEl = el;
        matchedLabel = el.getAttribute("title") || text || targetQuery;
        break;
      }
    }

    if (!matchedEl) return null;

    const rect = matchedEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const xPercent = Math.round((centerX / window.innerWidth) * 100);
    const yPercent = Math.round((centerY / window.innerHeight) * 100);

    this.onMouseAction({
      xPercent,
      yPercent,
      label: matchedLabel,
      clicked: shouldClick,
      timestamp: Date.now(),
    });

    if (shouldClick) {
      setTimeout(() => {
        matchedEl?.click();
        if (
          matchedEl instanceof HTMLInputElement ||
          matchedEl instanceof HTMLTextAreaElement
        ) {
          matchedEl.focus();
        }
      }, 450);
    }

    return {
      foundInApp: true,
      label: matchedLabel,
      xPercent,
      yPercent,
    };
  }

  /**
   * Uses Gemini Vision to inspect the live shared screen, locate any requested button/element,
   * move the AI mouse pointer to its coordinates, and describe what is on screen.
   */
  public async inspectScreenAndLocateElement(
    userQuery: string,
    shouldClick: boolean = true,
  ): Promise<{
    spokenSummary: string;
    xPercent?: number;
    yPercent?: number;
    targetLabel?: string;
  }> {
    // 1. First check if the user is referring to a button right inside the Muskan AI interface
    const isClickIntent =
      /\b(click|press|tap|on\s*karo|kholo|band\s*karo|daba|select)\b/i.test(
        userQuery,
      ) || /(क्लिक|दबाओ|ऑन|खोलो|बंद)/.test(userQuery);

    const appMatch = this.triggerMouseOnAppElement(
      userQuery,
      shouldClick && isClickIntent,
    );
    if (appMatch && isClickIntent) {
      return {
        spokenSummary: `Ji Khaleel Boss, maine screen par ${appMatch.label} (${appMatch.xPercent}%, ${appMatch.yPercent}%) ko dekh kar us par click kar diya hai, Sir.`,
        xPercent: appMatch.xPercent,
        yPercent: appMatch.yPercent,
        targetLabel: appMatch.label,
      };
    }

    // 2. Capture frame from shared screen (if active)
    const frameBase64 = this.captureFrameBase64(1280);
    if (!frameBase64) {
      if (appMatch) {
        return {
          spokenSummary: `Ji Boss, ${appMatch.label} aapki screen par (${appMatch.xPercent}%, ${appMatch.yPercent}%) position par hai aur maine pointer wahan le jakar dikha diya hai, Sir.`,
          xPercent: appMatch.xPercent,
          yPercent: appMatch.yPercent,
          targetLabel: appMatch.label,
        };
      }
      return {
        spokenSummary:
          "Ji Khaleel Boss, aapki poori screen dekhne ke liye maine Screen Vision request on ki hai—bas 'Share Screen' select kar dijiye taaki main har button dekh sakoon, Sir.",
      };
    }

    const apiKey = getActiveGeminiApiKey();
    if (!apiKey) {
      return {
        spokenSummary:
          "Boss, screen vision analyze karne ke liye Gemini Brain API key zaroori hai.",
      };
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: frameBase64,
            },
          },
          {
            text: `You are Muskan AI looking directly at Khaleel Boss's live computer screen.
Khaleel Boss's command/question: "${userQuery}"

Analyze the screenshot carefully and return JSON with:
1. "spokenSummary": A crisp, warm 1-2 sentence Hinglish response (addressing him as "Khaleel Boss" or "Sir", NEVER saying Assalamualaikum) explaining what is on his screen or exactly where the requested button/element is located.
2. "targetLabel": Name of the button or UI element he asked about (or main active element on screen).
3. "xPercent": Horizontal coordinate percentage (0 to 100, left to right) of the center of that button/element on screen.
4. "yPercent": Vertical coordinate percentage (0 to 100, top to bottom) of the center of that button/element on screen.`,
          },
        ],
        config: {
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              spokenSummary: { type: Type.STRING },
              targetLabel: { type: Type.STRING },
              xPercent: { type: Type.NUMBER },
              yPercent: { type: Type.NUMBER },
            },
            required: ["spokenSummary", "targetLabel", "xPercent", "yPercent"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      const xPercent = Math.max(
        5,
        Math.min(95, Math.round(Number(parsed.xPercent) || 50)),
      );
      const yPercent = Math.max(
        5,
        Math.min(95, Math.round(Number(parsed.yPercent) || 50)),
      );
      const targetLabel = parsed.targetLabel || "Target Element";
      const spokenSummary =
        parsed.spokenSummary ||
        `Ji Khaleel Boss, aapki screen par ${targetLabel} (${xPercent}%, ${yPercent}%) par hai, maine pointer wahan point kar diya hai, Sir.`;

      // Move virtual AI mouse to the detected coordinates on screen
      this.onMouseAction({
        xPercent,
        yPercent,
        label: targetLabel,
        clicked: shouldClick,
        timestamp: Date.now(),
      });

      // Also click if the element exists inside our own viewport at those coordinates
      if (shouldClick && isClickIntent) {
        const px = (xPercent / 100) * window.innerWidth;
        const py = (yPercent / 100) * window.innerHeight;
        const domEl = document.elementFromPoint(px, py) as HTMLElement | null;
        if (domEl && domEl !== document.body) {
          setTimeout(() => {
            domEl.click();
          }, 450);
        }
      }

      return {
        spokenSummary,
        xPercent,
        yPercent,
        targetLabel,
      };
    } catch {
      return {
        spokenSummary:
          "Ji Boss, main aapki screen dekh rahi hoon. Aap kis button par click karwana chahte hain, Sir?",
      };
    }
  }
}

export const screenVisionManager = new ScreenVisionManager();
