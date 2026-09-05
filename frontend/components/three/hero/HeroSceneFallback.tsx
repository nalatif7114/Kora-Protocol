"use client";

import React from "react";
import { ProtocolConcept } from "../../landing/types";
import { Shield, ArrowRightLeft, Database, Activity, Lock, CheckCircle2 } from "lucide-react";

interface HeroSceneFallbackProps {
  activeConcept: ProtocolConcept;
  onHoverConcept?: (concept: ProtocolConcept) => void;
  className?: string;
}

export const HeroSceneFallback: React.FC<HeroSceneFallbackProps> = ({
  activeConcept,
  onHoverConcept = () => {},
  className = "",
}) => {
  const isLiquidity = activeConcept === "liquidity";
  const isCollateral = activeConcept === "collateral";
  const isBorrow = activeConcept === "borrow";
  const isInterest = activeConcept === "interest";
  const isRisk = activeConcept === "risk" || activeConcept === "security";

  return (
    <div
      role="img"
      aria-label="Kora Institutional Lending Infrastructure Technical Blueprint"
      className={`relative w-full h-full min-h-[440px] sm:min-h-[520px] lg:min-h-[600px] rounded-2xl border border-border bg-card/70 backdrop-blur-md p-6 flex flex-col justify-between overflow-hidden ${className}`}
    >
      {/* Background Architectural Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b20_1px,transparent_1px),linear-gradient(to_bottom,#1e293b20_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Top Telemetry Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-border/80 pb-3 font-mono text-[11px]">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-white font-semibold tracking-wider">PROTOCOL ENGINE BLUEPRINT</span>
          <span className="text-muted">/ 1e27 RAY PRECISION</span>
        </div>
        <div className="text-slate-400 hidden sm:block">
          {activeConcept ? `ACTIVE: ${activeConcept.toUpperCase()}` : "EVM PARIS COMPATIBLE"}
        </div>
      </div>

      {/* Schematic Diagram Nodes */}
      <div className="relative z-10 my-auto grid grid-cols-3 gap-3 sm:gap-6 items-center">
        {/* Left Column: Asset Supply Inflows */}
        <div className="space-y-2.5">
          <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1">
            Liquidity Supply
          </div>
          {[
            { symbol: "USDC", apy: "4.68%", price: "$1.00" },
            { symbol: "WETH", apy: "3.85%", price: "$3,150" },
            { symbol: "WBTC", apy: "2.95%", price: "$64.2k" },
          ].map((asset) => (
            <div
              key={asset.symbol}
              onMouseEnter={() => onHoverConcept("liquidity")}
              onMouseLeave={() => onHoverConcept(null)}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer font-mono ${
                isLiquidity
                  ? "bg-emerald-500/15 border-emerald-500/60 shadow-sm shadow-emerald-500/20"
                  : "bg-surface/80 border-border hover:border-slate-600"
              }`}
            >
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">{asset.symbol}</span>
                <span className="text-emerald-400 text-[11px] font-bold">{asset.apy}</span>
              </div>
              <div className="text-[10px] text-muted mt-0.5">{asset.price}</div>
            </div>
          ))}
        </div>

        {/* Center Column: Core Reserve & Accounting Engine */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div
            onMouseEnter={() => onHoverConcept("liquidity")}
            onMouseLeave={() => onHoverConcept(null)}
            className={`w-32 h-32 sm:w-40 sm:h-40 rounded-2xl border flex flex-col items-center justify-center p-3 text-center transition-all cursor-pointer ${
              isLiquidity || isInterest || isBorrow
                ? "bg-accent/15 border-accent shadow-lg shadow-accent/20 scale-105"
                : "bg-surface border-border"
            }`}
          >
            <Database className="w-6 h-6 text-accent mb-1.5" />
            <div className="font-bold text-white text-xs font-mono">RESERVE CORE</div>
            <div className="text-[10px] text-slate-300 font-mono mt-0.5">$18.7M Cash</div>
            <div
              className={`text-[9px] font-mono mt-1 px-1.5 py-0.5 rounded border transition-colors ${
                isInterest
                  ? "bg-accent/30 border-accent text-white font-bold"
                  : "bg-accent/10 border-accent/20 text-accent"
              }`}
            >
              {isInterest ? "1e27 Ray Compounding" : "O(1) Scaled Shares"}
            </div>
          </div>
        </div>

        {/* Right Column: Collateral, Debt & Solvency Risk */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1">
            Risk & Debt Outflow
          </div>

          {/* Collateral Hub */}
          <div
            onMouseEnter={() => onHoverConcept("collateral")}
            onMouseLeave={() => onHoverConcept(null)}
            className={`p-2.5 rounded-lg border transition-all cursor-pointer font-mono ${
              isCollateral
                ? "bg-cyan-500/15 border-cyan-500/60 shadow-sm shadow-cyan-500/20"
                : "bg-surface/80 border-border hover:border-slate-600"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white text-xs">COLLATERAL</span>
            </div>
            <div className="text-[10px] text-muted mt-1 flex justify-between">
              <span>Max LTV:</span>
              <span className="text-slate-200">75.0%</span>
            </div>
          </div>

          {/* Borrow Debt Hub */}
          <div
            onMouseEnter={() => onHoverConcept("borrow")}
            onMouseLeave={() => onHoverConcept(null)}
            className={`p-2.5 rounded-lg border transition-all cursor-pointer font-mono ${
              isBorrow
                ? "bg-accent/20 border-accent shadow-sm shadow-accent/30"
                : "bg-surface/80 border-border hover:border-slate-600"
            }`}
          >
            <div className="flex items-center space-x-2">
              <ArrowRightLeft className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold text-white text-xs">BORROW HUB</span>
            </div>
            <div className="text-[10px] text-muted mt-1 flex justify-between">
              <span>Two-Kink APR:</span>
              <span className="text-accent font-bold">5.82%</span>
            </div>
          </div>

          {/* Risk Perimeter */}
          <div
            onMouseEnter={() => onHoverConcept("risk")}
            onMouseLeave={() => onHoverConcept(null)}
            className={`p-2.5 rounded-lg border transition-all cursor-pointer font-mono ${
              isRisk
                ? "bg-emerald-500/20 border-emerald-400 shadow-sm shadow-emerald-500/30"
                : "bg-surface/80 border-border hover:border-slate-600"
            }`}
          >
            <div className="flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-white text-xs">RISK ENGINE</span>
            </div>
            <div className="text-[10px] text-muted mt-1 flex justify-between">
              <span>Health Factor:</span>
              <span className="text-emerald-400 font-bold">1.84 (Safe)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Technical Status Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-border/80 pt-3 text-[10px] font-mono text-muted">
        <div className="flex items-center space-x-4">
          <span className="text-slate-300">
            UTILIZATION: <b className="text-white">67.2%</b>
          </span>
          <span className="text-slate-300">
            ROUNDING: <b className="text-emerald-400">FLOOR/CEIL</b>
          </span>
        </div>
        <div className="flex items-center space-x-1.5 text-accent">
          <Activity className="w-3 h-3" />
          <span>MULTI-TIER ORACLE VERIFIED</span>
        </div>
      </div>
    </div>
  );
};
