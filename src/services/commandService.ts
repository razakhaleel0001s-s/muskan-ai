interface TrackedTab {
  id: string;
  label: string;
  url: string;
  windowRef: Window | null;
  openedAt: number;
}

const openedTabs: TrackedTab[] = [];

/**
 * Opens a URL in a new browser tab and tracks the Window reference so Muskan can close or control it later.
 */
export function openTrackedTab(url: string, label?: string): Window | null {
  try {
    // Do NOT pass noopener so we retain the Window reference to close the tab on command
    const win = window.open(url, "_blank");
    const cleanLabel =
      label ||
      url
        .replace(/^https?:\/\/(www\.)?/i, "")
        .split("/")[0]
        .toLowerCase();

    if (win) {
      openedTabs.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: cleanLabel,
        url,
        windowRef: win,
        openedAt: Date.now(),
      });
    }
    return win;
  } catch {
    return null;
  }
}

/**
 * Closes the most recently opened tab or a specific tab matching targetKeyword.
 */
export function closeTrackedTab(targetKeyword?: string): {
  closedCount: number;
  closedLabel: string;
} {
  // Remove already-closed references first
  for (let i = openedTabs.length - 1; i >= 0; i--) {
    if (openedTabs[i].windowRef && openedTabs[i].windowRef?.closed) {
      openedTabs.splice(i, 1);
    }
  }

  if (openedTabs.length === 0) {
    return { closedCount: 0, closedLabel: "active tab" };
  }

  const cleanTarget = (targetKeyword || "")
    .toLowerCase()
    .replace(
      /\b(close|band|karo|kar|do|tab|tabs|window|chrome|google|browser|wala|wali|ka|ki|ke|all|saare|sabhi)\b/gi,
      " ",
    )
    .trim();

  if (cleanTarget) {
    for (let i = openedTabs.length - 1; i >= 0; i--) {
      const tab = openedTabs[i];
      if (
        tab.label.toLowerCase().includes(cleanTarget) ||
        tab.url.toLowerCase().includes(cleanTarget)
      ) {
        try {
          tab.windowRef?.close();
        } catch {}
        openedTabs.splice(i, 1);
        return { closedCount: 1, closedLabel: tab.label };
      }
    }
  }

  // Default: close the most recently opened tab
  const lastTab = openedTabs.pop()!;
  try {
    lastTab.windowRef?.close();
  } catch {}
  return { closedCount: 1, closedLabel: lastTab.label };
}

/**
 * Closes all tabs opened by Muskan in this session.
 */
export function closeAllTrackedTabs(): number {
  let count = 0;
  while (openedTabs.length > 0) {
    const tab = openedTabs.pop();
    if (tab?.windowRef && !tab.windowRef.closed) {
      try {
        tab.windowRef.close();
        count++;
      } catch {}
    }
  }
  return count;
}

/**
 * Native OS URI schemes for launching desktop applications directly on Windows / macOS / PC.
 */
const DESKTOP_OS_PROTOCOLS: Record<
  string,
  { protocolUrl: string; label: string; webFallback?: string }
> = {
  calculator: { protocolUrl: "calculator://", label: "Calculator" },
  calc: { protocolUrl: "calculator://", label: "Calculator" },
  कैलकुलेटर: { protocolUrl: "calculator://", label: "Calculator" },
  settings: { protocolUrl: "ms-settings:", label: "System Settings" },
  "pc settings": { protocolUrl: "ms-settings:", label: "System Settings" },
  "laptop settings": { protocolUrl: "ms-settings:", label: "System Settings" },
  "windows settings": { protocolUrl: "ms-settings:", label: "Windows Settings" },
  wifi: { protocolUrl: "ms-settings:network-wifi", label: "Wi-Fi Settings" },
  bluetooth: {
    protocolUrl: "ms-settings:bluetooth",
    label: "Bluetooth Settings",
  },
  display: { protocolUrl: "ms-settings:display", label: "Display & Brightness Settings" },
  brightness: { protocolUrl: "ms-settings:display", label: "Display & Brightness Settings" },
  sound: { protocolUrl: "ms-settings:sound", label: "Sound & Volume Settings" },
  volume: { protocolUrl: "ms-settings:sound", label: "Sound & Volume Settings" },
  power: { protocolUrl: "ms-settings:powersleep", label: "Power & Sleep Settings" },
  camera: { protocolUrl: "microsoft.windows.camera:", label: "Camera" },
  कैमरा: { protocolUrl: "microsoft.windows.camera:", label: "Camera" },
  clock: { protocolUrl: "ms-clock:", label: "Clock & Alarms" },
  alarm: { protocolUrl: "ms-clock:", label: "Clock & Alarms" },
  photos: { protocolUrl: "ms-photos:", label: "Photos App" },
  snip: { protocolUrl: "ms-screenclip:", label: "Screen Snip" },
  screenshot: { protocolUrl: "ms-screenclip:", label: "Screen Snip" },
  store: { protocolUrl: "ms-windows-store:", label: "Microsoft Store" },
  vscode: { protocolUrl: "vscode://", label: "VS Code" },
  "vs code": { protocolUrl: "vscode://", label: "VS Code" },
  "visual studio code": { protocolUrl: "vscode://", label: "VS Code" },
  mail: { protocolUrl: "mailto:", label: "Mail App" },
  outlook: { protocolUrl: "mailto:", label: "Outlook Mail" },
};

export function resolveDesktopProtocol(
  appQuery: string,
): { protocolUrl: string; label: string } | null {
  const cleaned = appQuery
    .toLowerCase()
    .replace(
      /\b(open|launch|start|on|kholo|khol|chalu|karo|kar|do|app|application|desktop|laptop|pc|mein|in|my|mera)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  if (DESKTOP_OS_PROTOCOLS[cleaned]) {
    return DESKTOP_OS_PROTOCOLS[cleaned];
  }

  for (const [key, val] of Object.entries(DESKTOP_OS_PROTOCOLS)) {
    if (cleaned.includes(key)) {
      return val;
    }
  }
  return null;
}

export function triggerOsProtocol(protocolUrl: string): void {
  try {
    const link = document.createElement("a");
    link.href = protocolUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    try {
      window.location.href = protocolUrl;
    } catch {}
  }
}

const KNOWN_WEBSITES: Record<string, string> = {
  "khaleel raza": "https://www.khaleelraza.com",
  khaleelraza: "https://www.khaleelraza.com",
  "khaleelraza.com": "https://www.khaleelraza.com",
  "my website": "https://www.khaleelraza.com",
  "meri website": "https://www.khaleelraza.com",
  "apni website": "https://www.khaleelraza.com",
  "my instagram": "https://www.instagram.com/khaleelraza.in/",
  "mera instagram": "https://www.instagram.com/khaleelraza.in/",
  "my youtube": "https://www.youtube.com/@Khaleelraza-in",
  "mera youtube": "https://www.youtube.com/@Khaleelraza-in",
  amazon: "https://www.amazon.in",
  अमेज़न: "https://www.amazon.in",
  अमेजन: "https://www.amazon.in",
  flipkart: "https://www.flipkart.com",
  फ्लिपकार्ट: "https://www.flipkart.com",
  myntra: "https://www.myntra.com",
  meesho: "https://www.meesho.com",
  ajio: "https://www.ajio.com",
  zomato: "https://www.zomato.com",
  swiggy: "https://www.swiggy.com",
  google: "https://www.google.com",
  गूगल: "https://www.google.com",
  youtube: "https://www.youtube.com",
  यूट्यूब: "https://www.youtube.com",
  instagram: "https://www.instagram.com",
  इंस्टाग्राम: "https://www.instagram.com",
  facebook: "https://www.facebook.com",
  फेसबुक: "https://www.facebook.com",
  twitter: "https://x.com",
  x: "https://x.com",
  linkedin: "https://www.linkedin.com",
  whatsapp: "https://web.whatsapp.com",
  व्हाट्सएप: "https://web.whatsapp.com",
  netflix: "https://www.netflix.com",
  spotify: "https://open.spotify.com",
  chatgpt: "https://chatgpt.com",
  github: "https://github.com",
  canva: "https://www.canva.com",
  wikipedia: "https://www.wikipedia.org",
  irctc: "https://www.irctc.co.in",
  bookmyshow: "https://in.bookmyshow.com",
  gmail: "https://mail.google.com",
  drive: "https://drive.google.com",
  maps: "https://maps.google.com",
};

/**
 * Resolves a brand name or domain string to a full, valid HTTPS URL.
 */
export function resolveWebsiteUrl(rawTarget: string): string {
  const cleaned = rawTarget
    .toLowerCase()
    .replace(
      /\b(ki|ka|ke|ko|website|site|web|page|official|on|karo|kar|do|kholo|khol|open|start|launch|please|zara|boss|sir|tab|chrome|वेबसाइट|ऑन|करो|खोलो|की|का)\b/gi,
      " ",
    )
    .replace(/[.,!?'"`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "https://www.khaleelraza.com";

  if (KNOWN_WEBSITES[cleaned]) {
    return KNOWN_WEBSITES[cleaned];
  }

  for (const [key, url] of Object.entries(KNOWN_WEBSITES)) {
    if (cleaned === key || cleaned.includes(key)) {
      return url;
    }
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  const domainCandidate = cleaned.replace(/\s+/g, "");
  if (domainCandidate.includes(".")) {
    return `https://www.${domainCandidate.replace(/^www\./i, "")}`;
  }

  return `https://www.${domainCandidate}.com`;
}

/**
 * Extracts a clean search query for Google Images by stripping conversational Hindi/English command words.
 */
export function cleanImageSearchQuery(rawCommand: string): string {
  let q = rawCommand
    .replace(
      /\b(mujhe|zara|please|acchi\s*si|achhi\s*si|acchi|achhi|badhiya\s*si|google\s*par|google\s*pe|google\s*mein|on\s*google|in\s*google|google|search\s*karo|search\s*kar\s*do|search\s*kar|search|on\s*karo|on\s*kar\s*do|dikhao|dikha\s*do|nikalo|kholo|open\s*karo|open|show\s*me|find)\b/gi,
      " ",
    )
    .replace(
      /(गूगल\s*पर|गूगल\s*पे|गूगल\s*में|गूगल|सर्च\s*करो|सर्च\s*कर\s*दो|सर्च|अच्छी\s*सी|अच्छी|बढ़िया\s*सी|दिखाओ|ऑन\s*करो|खोलो|मुझे)/g,
      " ",
    )
    .replace(
      /\b(ki\s*images|ki\s*image|ke\s*images|की\s*इमेजेस|की\s*इमेज|की\s*फोटो|के\s*फोटो|की\s*तस्वीर|की\s*तस्वीरें|ki\s*photos|ki\s*photo|ke\s*photos|ke\s*photo|ki\s*pics|ki\s*pic|ki\s*tasveer|images\s*of|photos\s*of|pictures\s*of|image\s*of|photo\s*of|images|image|photos|photo|pictures|picture|pics|pic|tasveer)\b/gi,
      " ",
    )
    .replace(
      /\b(शी\s*कबाब|सीख\s*कबाब|shish\s*kabab|sheekh\s*kabab|seek\s*kabab)\b/gi,
      "Seekh Kabab",
    )
    .replace(/[.,!?]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  q = q.replace(/\s+(ki|ka|ke|ko|se|par|की|का|के|को|से|पर)$/i, "").trim();
  q = q.replace(/^(ki|ka|ke|की|का|के)\s+/i, "").trim();

  return q || rawCommand.trim();
}

export function processCommand(command: string): {
  action: string;
  url?: string;
  osProtocolUrl?: string;
  closeTabTarget?: string;
  closeAllTabs?: boolean;
  isBrowserAction: boolean;
  notepadAction?: "open" | "close" | "toggle";
} {
  const lowerCmd = command.toLowerCase().trim();

  // 1. Notepad ON / Open commands
  if (
    lowerCmd === "notepad on" ||
    lowerCmd === "notepad on karo" ||
    lowerCmd === "open notepad" ||
    lowerCmd === "notepad kholo" ||
    lowerCmd === "show notepad" ||
    lowerCmd === "नोटपैड ऑन करो" ||
    lowerCmd === "नोटपैड खोलो"
  ) {
    return {
      action: "Ji Boss, aapka Notepad on kar diya hai, Sir.",
      isBrowserAction: true,
      notepadAction: "open",
    };
  }

  // 2. Notepad OFF / Close commands
  if (
    lowerCmd === "notepad off" ||
    lowerCmd === "notepad off karo" ||
    lowerCmd === "close notepad" ||
    lowerCmd === "notepad band karo" ||
    lowerCmd === "hide notepad" ||
    lowerCmd === "नोटपैड ऑफ करो" ||
    lowerCmd === "नोटपैड बंद करो"
  ) {
    return {
      action: "Ji Boss, aapka Notepad off kar diya hai, Sir.",
      isBrowserAction: true,
      notepadAction: "close",
    };
  }

  // 3. Close Chrome / Browser Tabs ("close tab", "tab band karo", "close all tabs", "amazon ka tab band karo")
  const isCloseTabCommand =
    (/\b(tab|tabs|window)\b/i.test(lowerCmd) &&
      /\b(close|band|off|hato|hatao|kill)\b/i.test(lowerCmd)) ||
    (/(टैब|विंडो)/.test(command) && /(बंद|क्लोज|हटाओ)/.test(command));

  if (isCloseTabCommand) {
    const isAll =
      /\b(all|saare|sabhi|sab|every)\b/i.test(lowerCmd) ||
      /(सारे|सभी|सब)/.test(command);
    if (isAll) {
      return {
        action:
          "Ji Khaleel Boss, maine saare active browser tabs close kar diye hain, Sir.",
        closeAllTabs: true,
        isBrowserAction: true,
      };
    }
    return {
      action: "Ji Khaleel Boss, maine browser tab close kar diya hai, Sir.",
      closeTabTarget: command,
      isBrowserAction: true,
    };
  }

  // 4. Desktop / Laptop OS App Launch ("open calculator", "laptop settings kholo", "open vs code", "camera on karo")
  const desktopProto = resolveDesktopProtocol(command);
  const hasLaunchWord =
    /\b(open|launch|start|on|kholo|khol|chalu|run)\b/i.test(lowerCmd) ||
    /(ऑन|खोलो|चालू|ओपन)/.test(command);
  if (desktopProto && hasLaunchWord) {
    return {
      action: `Ji Khaleel Boss, aapke system par ${desktopProto.label} launch kar rahi hoon, Sir.`,
      osProtocolUrl: desktopProto.protocolUrl,
      isBrowserAction: true,
    };
  }

  // 5. Google Images Search Detection (Photos / Images / Pics / Tasveer)
  const hasImageWord =
    /\b(image|images|photo|photos|pic|pics|picture|pictures|tasveer|wallpaper)\b/i.test(
      lowerCmd,
    ) || /(इमेज|इमेजेस|फोटो|फ़ोटो|तस्वीर|तस्वीरें|पिक्चर)/.test(command);

  const hasSearchOrOpenIntent =
    /\b(search|open|on|dikhao|kholo|nikalo|show|find|dekho|karo)\b/i.test(
      lowerCmd,
    ) || /(सर्च|ऑन|खोलो|दिखाओ|निकालो|करो|देखो)/.test(command);

  if (hasImageWord && hasSearchOrOpenIntent) {
    const cleanSubject = cleanImageSearchQuery(command);
    const googleImagesUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(cleanSubject)}`;
    return {
      action: `Ji Khaleel Boss, Google Images par "${cleanSubject}" ki photos open kar rahi hoon, Sir.`,
      url: googleImagesUrl,
      isBrowserAction: true,
    };
  }

  // 6. Explicit Website / Chrome Tab Open Detection ("Amazon ki website on karo", "Open Flipkart", etc.)
  const isCheckOrAuditIntent =
    /\b(check|audit|scan|verify|monetiz|article\s*hai)\b/i.test(lowerCmd) ||
    /(चेक|आर्टिकल\s*है|मोनेटाइज)/.test(command);

  const hasWebsiteOpenIntent =
    !isCheckOrAuditIntent &&
    !hasImageWord &&
    ((/\b(website|site|tab|chrome)\b/i.test(lowerCmd) &&
      /\b(on|open|kholo|khol|start|launch|chalu)\b/i.test(lowerCmd)) ||
      (/(वेबसाइट|साइट|टैब|क्रोम)/.test(command) &&
        /(ऑन|खोलो|खोल|चालू|ओपन)/.test(command)) ||
      /^open\s+(.+)$/i.test(lowerCmd) ||
      /^(.+?)\s+(ki\s+website|website)\s+(on\s+karo|kholo|open\s+karo|on\s+kar\s+do|chalu\s+karo)$/i.test(
        lowerCmd,
      ) ||
      /^(.+?)\s+(on\s+karo|kholo|open\s+karo)$/i.test(lowerCmd));

  if (
    hasWebsiteOpenIntent &&
    !lowerCmd.includes("youtube par") &&
    !lowerCmd.includes("on youtube") &&
    !lowerCmd.includes("on spotify") &&
    !lowerCmd.includes("notepad")
  ) {
    const targetUrl = resolveWebsiteUrl(command);
    const displayDomain = targetUrl
      .replace(/^https?:\/\/(www\.)?/i, "")
      .split("/")[0];
    return {
      action: `Ji Khaleel Boss, ${displayDomain} open kar rahi hoon, Sir.`,
      url: targetUrl,
      isBrowserAction: true,
    };
  }

  // 7. Media Search: "Play [song/video] on YouTube"
  const ytMatch = lowerCmd.match(/^play\s+(.+?)\s+on\s+youtube$/);
  if (ytMatch) {
    const query = encodeURIComponent(ytMatch[1].trim());
    return {
      action: `Ji Khaleel Boss, YouTube par "${ytMatch[1]}" play kar rahi hoon, Sir.`,
      url: `https://www.youtube.com/results?search_query=${query}`,
      isBrowserAction: true,
    };
  }

  // 8. Media Search: "Search [query] on Spotify"
  const spotifyMatch = lowerCmd.match(/^search\s+(.+?)\s+on\s+spotify$/);
  if (spotifyMatch) {
    const query = encodeURIComponent(spotifyMatch[1].trim());
    return {
      action: `Ji Khaleel Sir, Spotify par "${spotifyMatch[1]}" search kar rahi hoon.`,
      url: `https://open.spotify.com/search/${query}`,
      isBrowserAction: true,
    };
  }

  // 9. WhatsApp Web: "Send a WhatsApp message to [number] saying [message]"
  const waMatch = lowerCmd.match(
    /^send\s+a\s+whatsapp\s+message\s+to\s+([\d\+\s]+)\s+saying\s+(.+)$/,
  );
  if (waMatch) {
    const number = waMatch[1].replace(/\s+/g, "");
    const message = encodeURIComponent(waMatch[2].trim());
    return {
      action: `InshaAllah, aapka WhatsApp message bhej rahi hoon, Khaleel Boss.`,
      url: `https://web.whatsapp.com/send?phone=${number}&text=${message}`,
      isBrowserAction: true,
    };
  }

  return { action: "", isBrowserAction: false };
}
