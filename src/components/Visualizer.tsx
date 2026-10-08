import { motion } from "motion/react";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface VisualizerProps {
  state: VisualizerState;
}

export default function Visualizer({ state }: VisualizerProps) {
  const getRingAnimation = (index: number, reverse: boolean = false) => {
    const baseSpeed =
      state === "listening"
        ? 4.2
        : state === "processing"
          ? 1.8
          : state === "speaking"
            ? 2.6
            : 18;
    return {
      rotate: reverse ? [-360, 0] : [0, 360],
      transition: {
        duration: baseSpeed + index * 2.8,
        repeat: Infinity,
        ease: "linear" as const,
      },
    };
  };

  const getPulseAnimation = () => {
    if (state === "speaking") {
      return {
        scale: [1, 1.06, 0.98, 1.04, 1],
        opacity: [0.9, 1, 0.88, 1, 0.9],
        transition: {
          duration: 0.55,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };
    }
    if (state === "listening") {
      return {
        scale: [1, 1.035, 1],
        opacity: [0.82, 1, 0.82],
        transition: {
          duration: 1.4,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };
    }
    if (state === "processing") {
      return {
        scale: [0.98, 1.04, 0.98],
        opacity: [0.75, 1, 0.75],
        transition: {
          duration: 0.75,
          repeat: Infinity,
          ease: "easeInOut" as const,
        },
      };
    }
    return {
      scale: [1, 1.02, 1],
      opacity: [0.65, 0.85, 0.65],
      transition: {
        duration: 4.5,
        repeat: Infinity,
        ease: "easeInOut" as const,
      },
    };
  };

  const getTheme = () => {
    switch (state) {
      case "listening":
        return {
          primary: "#f59e0b",
          secondary: "#fbbf24",
          glow: "rgba(245, 158, 11, 0.45)",
          softGlow: "rgba(245, 158, 11, 0.14)",
          borderClass: "border-amber-400/70",
          label: "LISTENING",
          dotClass: "bg-amber-400",
        };
      case "processing":
        return {
          primary: "#38bdf8",
          secondary: "#7dd3fc",
          glow: "rgba(56, 189, 248, 0.55)",
          softGlow: "rgba(56, 189, 248, 0.16)",
          borderClass: "border-sky-400/80",
          label: "ANALYZING",
          dotClass: "bg-sky-400",
        };
      case "speaking":
        return {
          primary: "#fbbf24",
          secondary: "#22d3ee",
          glow: "rgba(251, 191, 36, 0.55)",
          softGlow: "rgba(251, 191, 36, 0.16)",
          borderClass: "border-amber-300/85",
          label: "SPEAKING",
          dotClass: "bg-amber-300",
        };
      default:
        return {
          primary: "#06b6d4",
          secondary: "#22d3ee",
          glow: "rgba(6, 182, 212, 0.38)",
          softGlow: "rgba(6, 182, 212, 0.11)",
          borderClass: "border-cyan-400/50",
          label: "STANDBY",
          dotClass: "bg-cyan-400",
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
      {/* Deep Atmospheric Core Aura */}
      <motion.div
        animate={getPulseAnimation()}
        className="absolute w-[340px] h-[340px] md:w-[540px] md:h-[540px] rounded-full blur-[100px]"
        style={{ backgroundColor: theme.softGlow }}
      />

      {/* Precision SVG Outer Orbital Dial */}
      <motion.div
        animate={getRingAnimation(4, false)}
        className="absolute w-[330px] h-[330px] md:w-[500px] md:h-[500px]"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle
            cx="100"
            cy="100"
            r="96"
            fill="none"
            stroke={theme.primary}
            strokeWidth="0.4"
            strokeDasharray="2 6"
            opacity="0.35"
          />
          <circle
            cx="100"
            cy="100"
            r="91"
            fill="none"
            stroke={theme.secondary}
            strokeWidth="0.7"
            strokeDasharray="36 24 8 24"
            opacity="0.25"
          />
        </svg>
      </motion.div>

      {/* Precision SVG Ring 2 (Counter-Rotating Segmented Arc) */}
      <motion.div
        animate={getRingAnimation(3, true)}
        className="absolute w-[285px] h-[285px] md:w-[430px] md:h-[430px]"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="none"
            stroke={theme.primary}
            strokeWidth="1"
            strokeDasharray="1 5"
            opacity="0.45"
          />
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke={theme.secondary}
            strokeWidth="1.4"
            strokeDasharray="55 40 15 40"
            strokeLinecap="round"
            opacity="0.38"
          />
        </svg>
      </motion.div>

      {/* Precision SVG Ring 3 (Tactical Dual Arc) */}
      <motion.div
        animate={getRingAnimation(2, false)}
        className="absolute w-[240px] h-[240px] md:w-[360px] md:h-[360px]"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={theme.primary}
            strokeWidth="1.6"
            strokeDasharray="85 72"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      </motion.div>

      {/* Precision SVG Ring 4 (Inner High-Speed Telemetry Ring) */}
      <motion.div
        animate={getRingAnimation(1, true)}
        className="absolute w-[200px] h-[200px] md:w-[295px] md:h-[295px]"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={theme.secondary}
            strokeWidth="1.5"
            strokeDasharray="8 10 28 10"
            strokeLinecap="round"
            opacity="0.65"
          />
        </svg>
      </motion.div>

      {/* Precision SVG Ring 5 (Core Harmonic Ring) */}
      <motion.div
        animate={getRingAnimation(0, false)}
        className="absolute w-[166px] h-[166px] md:w-[242px] md:h-[242px]"
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="none"
            stroke={theme.primary}
            strokeWidth="2.2"
            strokeDasharray="2 7"
            strokeLinecap="round"
            opacity="0.82"
          />
        </svg>
      </motion.div>

      {/* Central Glassmorphic Energy Core */}
      <motion.div
        animate={getPulseAnimation()}
        className={`relative w-[134px] h-[134px] md:w-[196px] md:h-[196px] rounded-full border ${theme.borderClass} bg-gradient-to-b from-[#071522]/90 via-[#030b12]/95 to-[#02060a]/95 backdrop-blur-xl flex flex-col items-center justify-center transition-colors duration-500`}
        style={{
          boxShadow: `0 0 45px ${theme.glow}, inset 0 0 28px ${theme.glow}`,
        }}
      >
        {/* Subtle Inner Ring Highlight */}
        <div className="absolute inset-2.5 rounded-full border border-white/10 pointer-events-none" />

        {/* MUSKAN Title */}
        <div
          className="font-display font-bold tracking-[0.28em] text-xl md:text-3xl text-white pl-[0.28em] transition-all duration-300"
          style={{
            textShadow: `0 0 14px ${theme.primary}, 0 0 28px ${theme.glow}`,
          }}
        >
          MUSKAN
        </div>

        {/* Dynamic Equalizer / Status Micro-Bar inside Core */}
        <div className="mt-2 flex items-center gap-1.5">
          {state === "speaking" || state === "listening" ? (
            <div className="flex items-end gap-1 h-3">
              {[0, 1, 2, 3, 4].map((bar) => (
                <motion.span
                  key={bar}
                  animate={{
                    height:
                      state === "speaking"
                        ? ["4px", "12px", "5px", "10px", "4px"]
                        : ["3px", "8px", "4px", "3px"],
                  }}
                  transition={{
                    duration: state === "speaking" ? 0.5 : 0.9,
                    repeat: Infinity,
                    delay: bar * 0.1,
                    ease: "easeInOut",
                  }}
                  className="w-0.5 rounded-full"
                  style={{ backgroundColor: theme.secondary }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${theme.dotClass} ${
                  state === "processing" ? "animate-ping" : " opacity-80"
                }`}
              />
              <span className="text-[9px] md:text-[10px] font-mono tracking-[0.24em] text-slate-300/75 uppercase">
                {theme.label}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
