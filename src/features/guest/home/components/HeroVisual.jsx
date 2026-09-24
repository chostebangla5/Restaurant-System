import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Activity, Zap, CheckCircle2 } from 'lucide-react';

export function HeroVisual() {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none select-none">
      {/* Background SVG Circuit / Node Network */}
      <svg
        className="absolute -top-10 -left-10 w-[120%] h-[120%] pointer-events-none opacity-40"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="hero-line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C6FF3D" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#C6FF3D" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="wave-area-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#C6FF3D" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#C6FF3D" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Static Grid Lines */}
        <line x1="80" y1="0" x2="80" y2="500" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <line x1="250" y1="0" x2="250" y2="500" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <line x1="420" y1="0" x2="420" y2="500" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <line x1="0" y1="280" x2="500" y2="280" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
        <line x1="0" y1="420" x2="500" y2="420" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />

        {/* Connecting Neural / Network Paths */}
        <path
          d="M 80 120 L 250 120 L 320 200 L 420 200 L 420 380"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M 80 120 L 250 120 L 320 200 L 420 200 L 420 380"
          stroke="url(#hero-line-gradient)"
          strokeWidth="1.5"
          strokeDasharray="16 120"
          fill="none"
          className="animate-[dash_6s_linear_infinite]"
        />

        {/* Junction Nodes */}
        <circle cx="80" cy="120" r="3" fill="#C6FF3D" />
        <circle cx="250" cy="120" r="4" fill="#C6FF3D" opacity="0.8" />
        <circle cx="320" cy="200" r="3" fill="#C6FF3D" />
        <circle cx="420" cy="200" r="4" fill="#C6FF3D" opacity="0.8" />
        <circle cx="420" cy="380" r="3" fill="#C6FF3D" />
      </svg>

      {/* Floating Card Stack */}
      <div className="relative z-10 flex flex-col gap-4">
        {/* Top Autonomous Status Pill */}
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="self-end mr-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-[#0E1016]/90 backdrop-blur-md shadow-lg"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-wider text-text font-medium flex items-center gap-1.5">
            <Cpu className="h-3 w-3 text-accent" strokeWidth={1.5} />
            <span>AI ORCHESTRATION ACTIVE</span>
          </span>
        </motion.div>

        {/* Main Telemetry & Dispatch Hub Card */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="card-surface rounded-card border border-white/[0.09] p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5 relative overflow-hidden"
        >
          {/* Subtle accent corner highlight */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/[0.04] rounded-full blur-2xl pointer-events-none" />

          {/* Card Header */}
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-surface-2 border border-white/10 flex items-center justify-center text-accent">
                <Activity className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-mono text-xs font-semibold text-text tracking-wide uppercase">
                  DISPATCH ENGINE // v4.2
                </p>
                <p className="text-[10px] font-mono text-muted uppercase tracking-wider">
                  PostgreSQL RLS Pipeline
                </p>
              </div>
            </div>
            <div className="font-mono text-[11px] text-accent font-semibold px-2.5 py-1 rounded-full border border-accent/20 bg-accent/10">
              60 FPS SYNC
            </div>
          </div>

          {/* Telemetry Waveform Graph */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-muted">
              <span>THROUGHPUT TELEMETRY</span>
              <span className="text-text font-bold">1,420 REQ / SEC</span>
            </div>

            <div className="h-24 w-full bg-surface-2/60 rounded-xl border border-white/[0.06] p-2 relative overflow-hidden flex items-end">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 300 80">
                <path
                  d="M 0 65 Q 45 20, 90 45 T 180 25 T 240 50 T 300 20 L 300 80 L 0 80 Z"
                  fill="url(#wave-area-gradient)"
                />
                <path
                  d="M 0 65 Q 45 20, 90 45 T 180 25 T 240 50 T 300 20"
                  fill="none"
                  stroke="#C6FF3D"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Three-Column Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-white/[0.07] text-left">
            <div>
              <p className="text-[10px] font-mono text-muted uppercase tracking-wider">LATENCY</p>
              <p className="text-sm font-mono font-bold text-text mt-0.5">0.18s</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-muted uppercase tracking-wider">ROUTING</p>
              <p className="text-sm font-mono font-bold text-accent mt-0.5">SUB-SEC</p>
            </div>
            <div>
              <p className="text-[10px] font-mono text-muted uppercase tracking-wider">ACCURACY</p>
              <p className="text-sm font-mono font-bold text-text mt-0.5">99.98%</p>
            </div>
          </div>
        </motion.div>

        {/* Secondary Offset Live Order Pipeline Card */}
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
          className="self-start -mt-3 ml-4 max-w-sm rounded-2xl border border-white/[0.08] bg-[#141721]/95 p-4 shadow-xl backdrop-blur-md space-y-2.5"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[11px] text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
              KITCHEN STATIONS ACTIVE
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full border border-white/10 bg-surface text-[10px] font-mono text-text flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5 text-accent" />
              HOT STATION
            </span>
            <span className="px-2.5 py-1 rounded-full border border-white/10 bg-surface text-[10px] font-mono text-text flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5 text-accent" />
              COLD
            </span>
            <span className="px-2.5 py-1 rounded-full border border-white/10 bg-surface text-[10px] font-mono text-text flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5 text-accent" />
              BAR
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
