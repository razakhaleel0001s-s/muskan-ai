import React, { useState } from "react";
import { Copy, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PromptNotepadProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onChangeContent: (content: string) => void;
}

export default function PromptNotepad({
  isOpen,
  onClose,
  content,
  onChangeContent,
}: PromptNotepadProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy method if clipboard API is restricted in iframe
      try {
        const textarea = document.createElement("textarea");
        textarea.value = content;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Ignore
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed bottom-28 right-6 z-40 w-[320px] sm:w-[370px] bg-[#05101a]/95 border border-cyan-500/30 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl overflow-hidden flex flex-col"
        >
          {/* Subtle Top Accent Glow */}
          <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />

          {/* Minimal Header: Title + 1-Click Copy + Close */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#030b12]/90">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <span className="text-xs font-display font-bold tracking-[0.2em] text-cyan-300 uppercase">
                NOTEPAD
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!content.trim()}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer disabled:opacity-35 ${
                  copied
                    ? "bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                    : "bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                }`}
              >
                {copied ? (
                  <>
                    <Check size={13} />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close Notepad"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Pure Prompt Text Box */}
          <textarea
            value={content}
            onChange={(e) => onChangeContent(e.target.value)}
            placeholder="Jo bhi prompt ya text aap Muskan ko likhne bolenge, woh seedha yahan likha jayega..."
            className="w-full h-48 bg-transparent p-4 text-sm text-slate-100 placeholder:text-slate-500 leading-relaxed resize-none outline-none scrollbar-hide"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
