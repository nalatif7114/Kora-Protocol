"use client";

import React from "react";
import { MarketReserve } from "../lib/mockData";
import { ArrowUpRight, ArrowDownLeft, Shield } from "lucide-react";

interface MarketsTableProps {
  reserves: MarketReserve[];
  onSelectReserve: (reserve: MarketReserve, action: "supply" | "borrow") => void;
}

export const MarketsTable: React.FC<MarketsTableProps> = ({ reserves, onSelectReserve }) => {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/50">
        <div>
          <h2 className="font-semibold text-white text-base">Core Lending & Borrowing Markets</h2>
          <p className="text-xs text-muted">Two-kink deterministic rate models & live oracle valuations</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface/70 text-muted uppercase tracking-wider font-mono border-b border-border text-[11px]">
            <tr>
              <th className="py-3.5 px-6">Asset</th>
              <th className="py-3.5 px-4">Price</th>
              <th className="py-3.5 px-4">Total Supplied</th>
              <th className="py-3.5 px-4">Supply APY</th>
              <th className="py-3.5 px-4">Total Borrowed</th>
              <th className="py-3.5 px-4">Borrow APR</th>
              <th className="py-3.5 px-4">Utilization</th>
              <th className="py-3.5 px-4">Max LTV</th>
              <th className="py-3.5 px-6 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-slate-200">
            {reserves.map((reserve) => {
              const utilPercent = reserve.utilizationRate * 100;
              return (
                <tr key={reserve.symbol} className="hover:bg-cardHover/60 transition-colors">
                  {/* Asset */}
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-accent text-xs">
                        {reserve.symbol.substring(0, 3)}
                      </div>
                      <div>
                        <div className="font-bold text-white font-sans text-sm">{reserve.symbol}</div>
                        <div className="text-[11px] text-muted font-sans">{reserve.name}</div>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-4 px-4 font-semibold text-white">
                    ${reserve.priceUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Total Supplied */}
                  <td className="py-4 px-4">
                    <div className="font-medium text-white">
                      {reserve.totalSupplied.toLocaleString()} {reserve.symbol}
                    </div>
                    <div className="text-[11px] text-muted">
                      ${(reserve.totalSupplied * reserve.priceUSD).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </td>

                  {/* Supply APY */}
                  <td className="py-4 px-4">
                    <span className="text-emerald-400 font-bold text-sm">
                      {(reserve.supplyAPY * 100).toFixed(2)}%
                    </span>
                  </td>

                  {/* Total Borrowed */}
                  <td className="py-4 px-4">
                    <div className="font-medium text-white">
                      {reserve.totalBorrowed.toLocaleString()} {reserve.symbol}
                    </div>
                    <div className="text-[11px] text-muted">
                      ${(reserve.totalBorrowed * reserve.priceUSD).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </td>

                  {/* Borrow APR */}
                  <td className="py-4 px-4">
                    <span className="text-accent font-bold text-sm">
                      {(reserve.borrowAPR * 100).toFixed(2)}%
                    </span>
                  </td>

                  {/* Utilization */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-background rounded-full h-1.5 overflow-hidden border border-border">
                        <div
                          className={`h-full rounded-full ${
                            utilPercent > 80 ? "bg-rose-500" : utilPercent > 60 ? "bg-warning" : "bg-emerald-500"
                          }`}
                          style={{ width: `${utilPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted">{utilPercent.toFixed(0)}%</span>
                    </div>
                  </td>

                  {/* Max LTV */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1 text-slate-300">
                      <Shield className="w-3.5 h-3.5 text-accent" />
                      <span>{(reserve.ltv * 100).toFixed(0)}%</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onSelectReserve(reserve, "supply")}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-sans font-medium transition-colors"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>Supply</span>
                      </button>
                      <button
                        onClick={() => onSelectReserve(reserve, "borrow")}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-accent/10 hover:bg-accent/20 text-accent border border-accent/30 text-xs font-sans font-medium transition-colors"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Borrow</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
