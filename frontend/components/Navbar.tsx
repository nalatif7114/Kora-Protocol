"use client";

import React from "react";
import { ShieldCheck, Activity, Terminal, RefreshCw, Wallet } from "lucide-react";

interface NavbarProps {
  activeTab: "landing" | "markets" | "terminal" | "radar";
  setActiveTab: (tab: "landing" | "markets" | "terminal" | "radar") => void;
  walletConnected: boolean;
  connectWallet: () => void;
  userAddress: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  walletConnected,
  connectWallet,
  userAddress,
}) => {
  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Tagline */}
        <div
          onClick={() => setActiveTab("landing")}
          className="flex items-center space-x-3 cursor-pointer group select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setActiveTab("landing");
          }}
          title="Return to Protocol Narrative"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent font-mono font-bold text-lg group-hover:border-accent/60 transition-colors">
            K
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-accent transition-colors">KORA</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                v1.0 MAINNET
              </span>
            </div>
            <p className="text-[11px] text-muted hidden sm:block">Modular Risk-Aware Lending Infrastructure</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-background/60 p-1 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab("markets")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "markets"
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:text-slate-200 hover:bg-surface"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Markets</span>
          </button>
          <button
            onClick={() => setActiveTab("terminal")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "terminal"
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:text-slate-200 hover:bg-surface"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Position Terminal</span>
          </button>
          <button
            onClick={() => setActiveTab("radar")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "radar"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-rose-400/80 hover:text-rose-300 hover:bg-surface"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Liquidation Radar</span>
          </button>
        </nav>

        {/* Wallet Connection */}
        <div className="flex items-center space-x-3">
          <button
            onClick={connectWallet}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-mono font-medium border border-border bg-surface hover:bg-cardHover text-slate-200 transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-accent" />
            <span>
              {walletConnected
                ? `${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}`
                : "Connect Wallet"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
