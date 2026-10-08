import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

/**
 * Generates and downloads a 1-time Windows Laptop Auto-Start & Voice Wake-Word Launcher script (.bat)
 * so Muskan AI starts automatically when the laptop turns on without needing to double-click any icon,
 * and listens for "Hello Muskan" immediately.
 */
export function downloadLaptopAutoStartScript(): void {
  const appUrl = window.location.origin;
  const batContent = [
    "@echo off",
    "title Muskan AI - One-Time Laptop Auto-Wake Setup",
    "color 0B",
    "echo =========================================================",
    "echo    MUSKAN AI - ONE-TIME LAPTOP AUTO-START SETUP",
    "echo    Creator & Boss: Khaleel Raza",
    "echo =========================================================",
    "echo.",
    'set "STARTUP_DIR=%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup"',
    'set "LAUNCHER_FILE=%STARTUP_DIR%\\MuskanAI-AutoWake.bat"',
    "",
    "echo Creating automatic Laptop Startup Voice Wake Launcher...",
    "(",
    "  echo @echo off",
    `  echo start "" chrome --app="${appUrl}?autowake=1" --autoplay-policy=no-user-gesture-required`,
    ') > "%LAUNCHER_FILE%"',
    "",
    "echo.",
    "echo [SUCCESS] One-Time Setup Complete!",
    "echo Ab jab bhi aap apna Laptop ON karenge, Muskan AI background mein",
    'echo khud-ba-khud ready rahegi. Bas "Hello Muskan" bolte hi active ho jayegi!',
    "echo.",
    `start "" chrome --app="${appUrl}?autowake=1" --autoplay-policy=no-user-gesture-required`,
    "pause",
  ].join("\r\n");

  const blob = new Blob([batContent], { type: "application/x-bat" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Muskan-AI-OneTime-Laptop-Setup.bat";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
