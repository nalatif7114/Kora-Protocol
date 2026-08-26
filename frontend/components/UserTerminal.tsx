"use client";

import React, { useState } from "react";
import { MarketReserve } from "../lib/mockData";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface UserTerminalProps {
  reserves: MarketReserve[];
  selectedReserve: MarketReserve;
  setSelectedReserve: (reserve: MarketReserve) => void;
  onExecuteAction: (
    action: "supply" | "withdraw" | "borrow" | "repay",
    symbol: string,
    amount: number
  ) => void;
  currentHealthFactor: number;
}

export const UserTerminal: React.FC<UserTerminalProps> = ({
  reserves,
  selectedReserve,
  setSelectedReserve,
  onExecuteAction,
  currentHealthFactor,
}) => {
  const [actionTab, setActionTab] = useState<"supply" | "withdraw" | "borrow" | "repay">("supply");
  const [amountInput, setAmountInput] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const amount = parseFloat(amountInput) || 0;

  // Max calculations
  const getMaxAmount = () => {
    switch (actionTab) {
      case "supply":
        return selectedReserve.walletBalance;
      case "withdraw":
        return selectedReserve.userSupplied;
      case "borrow":
        // Available borrow capacity in token units
        const maxBorrowUSD = 15000; // Simulated borrow power
        return Math.min(
          maxBorrowUSD / selectedReserve.priceUSD,
          selectedReserve.availableLiquidity
        );
      case "repay":
        return Math.min(selectedReserve.walletBalance, selectedReserve.userBorrowed);
    }
  };

  const handleMax = () => {
    const max = getMaxAmount();
    setAmountInput(max > 0 ? max.toString() : "0");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    setIsProcessing(true);
    setTimeout(() => {
      onExecuteAction(actionTab, selectedReserve.symbol, amount);
      setIsProcessing(false);
      setSuccessMessage(
        `Successfully executed ${actionTab.toUpperCase()} of ${amount} ${selectedReserve.symbol}!`
      );
      setAmountInput("");
      setTimeout(() => setSuccessMessage(null), 4000);
    }, 800);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div className="flex space-x-2">
          {(["supply", "withdraw", "borrow", "repay"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActionTab(tab);
                setSuccessMessage(null);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                actionTab === tab
                  ? tab === "supply" || tab === "withdraw"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "bg-accent text-white shadow-sm"
                  : "bg-surface hover:bg-cardHover text-muted"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Selected Asset Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-muted">Asset:</span>
          <select
            value={selectedReserve.symbol}
            onChange={(e) => {
              const res = reserves.find((r) => r.symbol === e.target.value);
              if (res) setSelectedReserve(res);
            }}
            className="bg-surface border border-border text-white text-xs font-mono font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
          >
            {reserves.map((r) => (
              <option key={r.symbol} value={r.symbol}>
                {r.symbol} (${r.priceUSD.toLocaleString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Action Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted">Amount to {actionTab}:</span>
            <div className="flex space-x-2 text-muted font-mono">
              <span>
                {actionTab === "supply"
                  ? `Wallet: ${selectedReserve.walletBalance} ${selectedReserve.symbol}`
                  : actionTab === "withdraw"
                  ? `Supplied: ${selectedReserve.userSupplied} ${selectedReserve.symbol}`
                  : actionTab === "borrow"
                  ? `Available Liquidity: ${selectedReserve.availableLiquidity.toLocaleString()}`
                  : `Borrowed: ${selectedReserve.userBorrowed} ${selectedReserve.symbol}`}
              </span>
              <button
                type="button"
                onClick={handleMax}
                className="text-accent hover:underline font-bold"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Input Box */}
          <div className="relative rounded-xl border border-border bg-surface p-3 flex items-center justify-between focus-within:border-accent">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="bg-transparent text-2xl font-bold font-mono text-white placeholder-slate-600 focus:outline-none w-full"
            />
            <div className="flex items-center space-x-2 bg-card px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-white font-mono">
              <span>{selectedReserve.symbol}</span>
            </div>
          </div>

          <div className="text-right text-[11px] text-muted font-mono mt-1">
            ≈ ${(amount * selectedReserve.priceUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        </div>

        {/* Action Transaction Parameters */}
        <div className="p-4 rounded-xl bg-surface/60 border border-border space-y-2 text-xs font-mono">
          <div className="flex justify-between text-muted">
            <span>Interest Rate Model:</span>
            <span className="text-slate-200">Kinked Linear Ray Model</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>{actionTab === "supply" || actionTab === "withdraw" ? "Supply APY:" : "Borrow APR:"}</span>
            <span className={actionTab === "supply" || actionTab === "withdraw" ? "text-emerald-400 font-bold" : "text-accent font-bold"}>
              {actionTab === "supply" || actionTab === "withdraw"
                ? `${(selectedReserve.supplyAPY * 100).toFixed(2)}%`
                : `${(selectedReserve.borrowAPR * 100).toFixed(2)}%`}
            </span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Directional Rounding Guarantee:</span>
            <span className="text-emerald-400">Strict Solvency Preserved</span>
          </div>
        </div>

        {/* Notification message */}
        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={amount <= 0 || isProcessing}
          className={`w-full py-3.5 rounded-xl font-bold font-sans text-sm flex items-center justify-center space-x-2 transition-all ${
            amount <= 0 || isProcessing
              ? "bg-surface border border-border text-muted cursor-not-allowed"
              : actionTab === "supply" || actionTab === "withdraw"
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              : "bg-accent hover:bg-accentHover text-white shadow-md shadow-accent/20"
          }`}
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Simulating & Executing EVM Transaction...</span>
            </>
          ) : (
            <>
              {actionTab === "supply" ? (
                <ArrowDownLeft className="w-4 h-4" />
              ) : actionTab === "withdraw" ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
              <span>
                Confirm {actionTab.toUpperCase()} {amount > 0 ? `${amount} ${selectedReserve.symbol}` : ""}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
