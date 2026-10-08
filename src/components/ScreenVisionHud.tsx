import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MousePointerClick,
  Monitor,
  Maximize2,
  Minimize2,
  X,
  Crosshair,
} from "lucide-react";
import {
  AiMouseAction,
  screenVisionManager,
} from "../services/screenVisionService";

interface ScreenVisionHudProps {
  isScreenActive: boolean;
  mouseAction: AiMouseAction | null;
  onStopScreen: () => void;
}

export default function ScreenVisionHud({
  isScreenActive,
  mouseAction,
  onStopScreen,
}: ScreenVisionHudProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (isScreenActive && videoRef.current) {
      const stream = screenVisionManager.getStream();
      if (stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isScreenActive, isExpanded]);

  useEffect(() => {
    if (!mouseAction) return;
    setShowCursor(true);
    const timer = setTimeout(() => {
      setShowCursor(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [mouseAction]);

  return (
    <>
      {/* 1. LIVE SCREEN VISION MONITOR (Top-Left Floating PIP) */}
      <AnimatePresence>
        {isScreenActive && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className={`fixed top-5 left-6 z-40 bg-[#04111c]/90 border border-cyan-400/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden transition-all duration-300 ${
              isExpanded
                ? "w-[340px] sm:w-[480px]"
                : "w-[220px] sm:w-[260px]"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-cyan-500/20 bg-[#020910]/90">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <Monitor size={13} className="text-cyan-300" />
                <span className="text-[10px] font-mono font-semibold tracking-[0.16em] text-cyan-200 uppercase">
                  SCREEN VISION LIVE
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title={isExpanded ? "Minimize Preview" : "Expand Preview"}
                >
                  {isExpanded ? (
                    <Minimize2 size={12} />
                  ) : (
                    <Maximize2 size={12} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={onStopScreen}
                  className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                  title="Stop Screen Vision"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Live Screen Video Stream + Target Pin */}
            <div className="relative w-full aspect-video bg-black overflow-hidden">
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="w-full h-full object-contain"
              />

              {/* Target Reticle inside Screen Preview when Muskan locates a button */}
              {mouseAction && (
                <motion.div
                  key={mouseAction.timestamp}
                  initial={{ scale: 1.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
                  style={{
                    left: `${mouseAction.xPercent}%`,
                    top: `${mouseAction.yPercent}%`,
                  }}
                >
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-7 h-7 rounded-full border border-emerald-400 animate-ping" />
                    <Crosshair size={18} className="text-emerald-300" />
                  </div>
                  <span className="mt-1 px-1.5 py-0.5 rounded bg-emerald-500/90 text-slate-950 font-mono text-[9px] font-bold whitespace-nowrap shadow">
                    {mouseAction.label}
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HOLOGRAPHIC AI VIRTUAL MOUSE POINTER OVERLAY */}
      <AnimatePresence>
        {showCursor && mouseAction && (
          <motion.div
            key="ai-virtual-mouse"
            initial={{
              opacity: 0,
              left: "50%",
              top: "50%",
              scale: 0.85,
            }}
            animate={{
              opacity: 1,
              left: `${mouseAction.xPercent}%`,
              top: `${mouseAction.yPercent}%`,
              scale: 1,
            }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{
              type: "spring",
              stiffness: 140,
              damping: 18,
            }}
            className="fixed z-50 pointer-events-none -translate-x-3 -translate-y-3"
          >
            {/* Click Ripple Effect */}
            {mouseAction.clicked && (
              <motion.div
                key={`ripple-${mouseAction.timestamp}`}
                initial={{ scale: 0.4, opacity: 1 }}
                animate={{ scale: 2.6, opacity: 0 }}
                transition={{ duration: 0.8, repeat: 1 }}
                className="absolute -left-3 -top-3 w-12 h-12 rounded-full border-2 border-cyan-300 bg-cyan-400/20"
              />
            )}

            {/* Glowing Pointer Icon + Label Badge */}
            <div className="relative flex items-start gap-2">
              <div className="p-1.5 rounded-full bg-cyan-400 text-slate-950 shadow-[0_0_25px_#22d3ee]">
                <MousePointerClick size={18} />
              </div>

              <div className="px-3 py-1 rounded-full bg-[#04121e]/95 border border-cyan-400/60 text-cyan-200 text-[11px] font-mono tracking-wider whitespace-nowrap shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                <span className="text-emerald-300 font-bold">
                  {mouseAction.clicked ? "CLICKED: " : "LOCATED: "}
                </span>
                <span>{mouseAction.label}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
