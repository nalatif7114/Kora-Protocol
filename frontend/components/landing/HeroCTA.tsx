"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, FileText, Droplets, ArrowUpRight, ShieldCheck } from "lucide-react";
import { ProtocolConcept } from "./types";

interface HeroCTAProps {
  activeConcept: ProtocolConcept;
  onHoverConcept: (concept: ProtocolConcept) => void;
  onLaunchApp?: () => void;
  onExploreProtocol?: () => void;
}

export const HeroCTA: React.FC<HeroCTAProps> = ({
  activeConcept,
  onHoverConcept,
  onLaunchApp,
  onExploreProtocol,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
      className="space-y-5 pt-2"
    >
      {/* Primary & Secondary Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onLaunchApp}
          className="px-6 py-3.5 rounded-xl bg-accent hover:bg-accentHover text-white font-sans font-semibold text-sm flex items-center space-x-2 shadow-lg shadow-accent/25 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
        >
          <span>Launch App</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onExploreProtocol}
          className="px-5 py-3.5 rounded-xl border border-border bg-surface hover:bg-cardHover text-slate-200 font-sans font-semibold text-sm flex items-center space-x-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-background"
        >
          <FileText className="w-4 h-4 text-muted" />
          <span>Explore Protocol</span>
        </button>
      </div>

      {/* Semantic Concept Hover Bridge */}
      <div className="pt-2">
        <div className="text-[11px] font-mono text-muted uppercase tracking-wider mb-2">
          Inspect Architecture Pipeline:
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onMouseEnter={() => onHoverConcept("liquidity")}
            onMouseLeave={() => onHoverConcept(null)}
            onFocus={() => onHoverConcept("liquidity")}
            onBlur={() => onHoverConcept(null)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center space-x-1.5 transition-all ${
              activeConcept === "liquidity"
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm shadow-emerald-500/20"
                : "bg-surface/80 border-border text-slate-300 hover:border-slate-500"
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-emerald-400" />
            <span>Liquidity Core</span>
          </button>

          <button
            onMouseEnter={() => onHoverConcept("borrow")}
            onMouseLeave={() => onHoverConcept(null)}
            onFocus={() => onHoverConcept("borrow")}
            onBlur={() => onHoverConcept(null)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center space-x-1.5 transition-all ${
              activeConcept === "borrow"
                ? "bg-accent/20 border-accent text-accent shadow-sm shadow-accent/20"
                : "bg-surface/80 border-border text-slate-300 hover:border-slate-500"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-accent" />
            <span>Borrow Hub</span>
          </button>

          <button
            onMouseEnter={() => onHoverConcept("risk")}
            onMouseLeave={() => onHoverConcept(null)}
            onFocus={() => onHoverConcept("risk")}
            onBlur={() => onHoverConcept(null)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center space-x-1.5 transition-all ${
              activeConcept === "risk"
                ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/20"
                : "bg-surface/80 border-border text-slate-300 hover:border-slate-500"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Risk Guard</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
