"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, ShieldAlert } from "lucide-react";

interface HealthFactorGaugeProps {
  healthFactor: number;
  totalCollateralUSD: number;
  totalDebtUSD: number;
  borrowPowerUSD: number;
}

export const HealthFactorGauge: React.FC<HealthFactorGaugeProps> = ({
  healthFactor,
  totalCollateralUSD,
  totalDebtUSD,
  borrowPowerUSD,
}) => {
  const isInfinite = healthFactor >= 999 || totalDebtUSD === 0;
  const isLiquidatable = !isInfinite && healthFactor < 1.0;
  const isWarning = !isInfinite && healthFactor >= 1.0 && healthFactor < 1.5;
  const isHealthy = isInfinite || healthFactor >= 1.5;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white text-sm">Account Risk & Liquidation Guard</h3>
          <p className="text-xs text-muted">Real-time health factor based on collateral & debt</p>
        </div>
        <div
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${
            isLiquidatable
              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
              : isWarning
              ? "bg-warning/10 text-warning border-warning/30"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
          }`}
        >
          {isLiquidatable ? (
            <ShieldAlert className="w-3.5 h-3.5" />
          ) : isWarning ? (
            <AlertTriangle className="w-3.5 h-3.5" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          <span>{isLiquidatable ? "LIQUIDATABLE" : isWarning ? "MODERATE RISK" : "HEALTHY"}</span>
        </div>
      </div>

      {/* Health Factor Display */}
      <div className="flex items-baseline space-x-3 mb-4">
        <span className="text-xs text-muted font-mono">Health Factor:</span>
        <span
          className={`text-3xl font-bold font-mono tracking-tight ${
            isLiquidatable ? "text-rose-400" : isWarning ? "text-warning" : "text-emerald-400"
          }`}
        >
          {isInfinite ? "∞" : healthFactor.toFixed(2)}
        </span>
        <span className="text-xs text-muted">
          {isInfinite
            ? "(No active debt positions)"
            : healthFactor < 1.0
            ? "(Immediate liquidation risk!)"
            : healthFactor < 1.5
            ? "(Recommend supplying more collateral)"
            : "(Position is safe)"}
        </span>
      </div>

      {/* Risk Bar Meter */}
      <div className="w-full bg-background rounded-full h-2.5 overflow-hidden border border-border mb-5">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isLiquidatable ? "bg-rose-500" : isWarning ? "bg-warning" : "bg-emerald-500"
          }`}
          style={{ width: `${isInfinite ? 100 : Math.min(100, (healthFactor / 3.0) * 100)}%` }}
        />
      </div>

      {/* Collateral & Debt Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3 rounded-lg bg-surface/80 border border-border">
          <div className="text-muted text-[11px] mb-1">Total Collateral</div>
          <div className="text-white font-bold text-sm">
            ${totalCollateralUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-surface/80 border border-border">
          <div className="text-muted text-[11px] mb-1">Total Outstanding Debt</div>
          <div className="text-white font-bold text-sm">
            ${totalDebtUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-surface/80 border border-border">
          <div className="text-muted text-[11px] mb-1">Available Borrow Power</div>
          <div className="text-emerald-400 font-bold text-sm">
            ${borrowPowerUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
};
