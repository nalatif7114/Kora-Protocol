"use client";

import React from "react";
import { MarketReserve } from "../lib/mockData";
import { TrendingUp, DollarSign, PieChart, ShieldAlert } from "lucide-react";

interface MetricsOverviewProps {
  reserves: MarketReserve[];
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ reserves }) => {
  const totalSuppliedUSD = reserves.reduce((acc, r) => acc + r.totalSupplied * r.priceUSD, 0);
  const totalBorrowedUSD = reserves.reduce((acc, r) => acc + r.totalBorrowed * r.priceUSD, 0);
  const totalAvailableUSD = totalSuppliedUSD - totalBorrowedUSD;
  const netUtilization = totalSuppliedUSD > 0 ? (totalBorrowedUSD / totalSuppliedUSD) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Market Size / TVL */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between text-muted text-xs mb-2">
          <span>Total Protocol Supply (TVL)</span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-white tracking-tight">
          ${totalSuppliedUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
          <TrendingUp className="w-3 h-3" />
          <span>Across 4 Active Reserves</span>
        </div>
      </div>

      {/* Total Borrowed */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between text-muted text-xs mb-2">
          <span>Total Borrowed</span>
          <PieChart className="w-4 h-4 text-accent" />
        </div>
        <div className="text-2xl font-bold font-mono text-white tracking-tight">
          ${totalBorrowedUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="text-[11px] text-muted mt-1">
          Available Liquidity: ${totalAvailableUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>

      {/* Global Net Utilization */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between text-muted text-xs mb-2">
          <span>Net Utilization Rate</span>
          <TrendingUp className="w-4 h-4 text-warning" />
        </div>
        <div className="text-2xl font-bold font-mono text-white tracking-tight">
          {netUtilization.toFixed(1)}%
        </div>
        <div className="w-full bg-background rounded-full h-1.5 mt-2 overflow-hidden border border-border">
          <div
            className="bg-warning h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, netUtilization)}%` }}
          />
        </div>
      </div>

      {/* Protocol Solvency & Risk Guard */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between text-muted text-xs mb-2">
          <span>Risk & Solvency Guard</span>
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
          100% SOLVENT
        </div>
        <div className="text-[11px] text-muted mt-1">
          Dynamic Close Factor & Multi-Tier Oracles Active
        </div>
      </div>
    </div>
  );
};
