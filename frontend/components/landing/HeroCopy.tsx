"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Cpu, Database } from "lucide-react";

export const HeroCopy: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Eyebrow Badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-border bg-surface/80 backdrop-blur-sm text-xs font-mono"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-white font-semibold tracking-wider">KORA PROTOCOL</span>
        <span className="text-muted">/ v1.0 MAINNET</span>
      </motion.div>

      {/* Main Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]"
      >
        Kora. <br className="hidden sm:inline" />
        <span className="bg-gradient-to-r from-slate-100 via-slate-200 to-accent bg-clip-text text-transparent">
          Lending, Engineered.
        </span>
      </motion.h1>

      {/* Supporting Description */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
        className="text-base sm:text-lg text-slate-300 max-w-xl font-normal leading-relaxed"
      >
        Modular decentralized lending infrastructure with transparent risk, adaptive liquidity, and on-chain settlement.
      </motion.p>

      {/* Telemetry Metrics Strip */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        className="pt-2 grid grid-cols-3 gap-3 max-w-lg font-mono text-xs"
      >
        <div className="p-3 rounded-xl bg-surface/60 border border-border">
          <div className="text-muted text-[10px] uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Database className="w-3 h-3 text-accent" />
            <span>Total Supply</span>
          </div>
          <div className="font-bold text-white text-sm">$18.7M</div>
        </div>

        <div className="p-3 rounded-xl bg-surface/60 border border-border">
          <div className="text-muted text-[10px] uppercase tracking-wider mb-1 flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Health Factor</span>
          </div>
          <div className="font-bold text-emerald-400 text-sm">1.84 Safe</div>
        </div>

        <div className="p-3 rounded-xl bg-surface/60 border border-border">
          <div className="text-muted text-[10px] uppercase tracking-wider mb-1 flex items-center space-x-1">
            <Cpu className="w-3 h-3 text-cyan-400" />
            <span>Precision</span>
          </div>
          <div className="font-bold text-cyan-400 text-sm">1e27 Ray</div>
        </div>
      </motion.div>
    </div>
  );
};
