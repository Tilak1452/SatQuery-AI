/**
 * LoadingScreen — Cinematic mission control HUD.
 *
 * Features:
 * - Orbital ring animation with satellite dots
 * - Gradient progress bar
 * - Scan-line telemetry terminal
 * - Staggered log entries with typewriter cursor
 */

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  messages: string[];
  visible: boolean;
}

export default function LoadingScreen({ messages, visible }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  // Asymptotic progress increment for dynamic feel
  useEffect(() => {
    if (!visible) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const remaining = 99.9 - prev;
        const target = Math.max(
          prev,
          Math.min(prev + remaining * 0.02 + Math.random() * 0.2, 99.9)
        );
        return target;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [visible, messages.length]);

  if (!visible) return null;

  const currentMessage =
    messages.length > 0 ? messages[messages.length - 1] : "INITIALIZING SYSTEM...";

  return (
    <div className="loading-screen">
      <div className="flex flex-col items-center justify-center max-w-lg w-full px-8 relative">

        {/* ---- Orbital Animation ---- */}
        <div className="orbital-container mb-14 motion-reduce:hidden">
          {/* Outer ring */}
          <div className="orbital-ring orbital-ring-1">
            <div className="orbital-dot" />
          </div>
          {/* Middle ring */}
          <div className="orbital-ring orbital-ring-2">
            <div className="orbital-dot orbital-dot-cyan" />
          </div>
          {/* Inner ring */}
          <div className="orbital-ring orbital-ring-3" />
          {/* Center core */}
          <div className="orbital-core" />

          {/* Crosshairs */}
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent top-1/2 -translate-y-1/2" />
          <div className="absolute h-full w-px bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent left-1/2 -translate-x-1/2" />
        </div>

        {/* Reduced-motion fallback */}
        <div className="hidden motion-reduce:flex w-32 h-32 mb-14 items-center justify-center border-2 border-emerald-500 rounded-full border-t-transparent animate-spin-slow">
          <span className="font-mono text-xs text-emerald-400 tracking-widest">ACTIVE</span>
        </div>

        {/* ---- Telemetry Terminal ---- */}
        <div className="telemetry-terminal">
          {/* Header bar */}
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-emerald-400/80 tracking-[0.2em] text-[10px] font-semibold uppercase">
                Sys_Link_Active
              </span>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              {progress.toFixed(1)}%
            </span>
          </div>

          {/* Gradient progress bar */}
          <div className="progress-bar-track mb-4">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Log entries */}
          <div className="h-28 overflow-hidden flex flex-col justify-end relative">
            {/* Fade gradient at top */}
            <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#060A13]/80 to-transparent z-10 pointer-events-none" />

            {messages.slice(-4, -1).map((msg, i) => {
              const actualIndex =
                Math.max(0, messages.length - Math.min(messages.length, 4)) + i;
              return (
                <div
                  key={actualIndex}
                  className="flex gap-3 text-slate-500 leading-relaxed"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <span className="text-emerald-600/50 shrink-0">
                    {`[${String(actualIndex).padStart(3, "0")}]`}
                  </span>
                  <span className="truncate">&gt; {msg.toUpperCase()}</span>
                </div>
              );
            })}

            {/* Active message with typewriter cursor */}
            <div className="flex gap-3 text-slate-200 leading-relaxed mt-1.5">
              <span className="text-emerald-400 shrink-0">
                {`[${String(Math.max(0, messages.length - 1)).padStart(3, "0")}]`}
              </span>
              <span className="overflow-hidden whitespace-nowrap border-r-2 border-emerald-400 pr-1 animate-typewriter-blink">
                &gt; {currentMessage.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
