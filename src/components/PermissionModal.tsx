import React from "react";
import { motion } from "motion/react";
import { MicOff, X } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function PermissionModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xl p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#05111b]/95 border border-cyan-500/25 rounded-3xl p-7 shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col items-center text-center relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-400 to-transparent" />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Close"
        >
          <X size={16} />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-5 shadow-[0_0_25px_rgba(239,68,68,0.2)]">
          <MicOff size={26} className="text-red-400" />
        </div>

        <h2 className="text-xl font-display font-bold tracking-wider text-white mb-2 uppercase">
          Microphone Access Needed
        </h2>
        <p className="text-slate-300/75 text-sm mb-6 leading-relaxed">
          Browser microphone permission is currently blocked. Please enable
          microphone access so Muskan can hear your voice commands.
        </p>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-left w-full mb-6">
          <p className="text-xs font-mono uppercase tracking-wider text-cyan-300 mb-2.5">
            Quick Setup Steps:
          </p>
          <ol className="text-xs text-slate-300/80 list-decimal pl-4 space-y-2 leading-relaxed">
            <li>
              Click the <strong>lock / tune icon</strong> next to the address
              bar at the top of your browser.
            </li>
            <li>
              Set <strong>Microphone</strong> permission to{" "}
              <strong>Allow</strong>.
            </li>
            <li>Reload the page or click Start Session again.</li>
          </ol>
        </div>

        <div className="flex w-full gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 py-3 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-[0_0_20px_rgba(34,211,238,0.3)]"
          >
            Reload Page
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </div>
  );
}
