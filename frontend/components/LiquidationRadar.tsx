"use client";

import React, { useState } from "react";
import { VulnerablePosition } from "../lib/mockData";
import { ShieldAlert, Zap, CheckCircle2, RefreshCw } from "lucide-react";

interface LiquidationRadarProps {
  positions: VulnerablePosition[];
  onLiquidate: (position: VulnerablePosition) => void;
}

export const LiquidationRadar: React.FC<LiquidationRadarProps> = ({ positions, onLiquidate }) => {
  const [liquidatingUser, setLiquidatingUser] = useState<string | null>(null);
  const [successEvent, setSuccessEvent] = useState<string | null>(null);

  const handleExecuteLiquidation = (pos: VulnerablePosition) => {
    setLiquidatingUser(pos.userAddress);
    setTimeout(() => {
      onLiquidate(pos);
      setLiquidatingUser(null);
      setSuccessEvent(
        `Liquidation successfully executed! Repaid $${pos.maxRepayUSD.toLocaleString()} ${pos.debtAsset} and seized $${pos.estimatedProfitUSD.toLocaleString()} net profit in ${pos.collateralAsset}!`
      );
      setTimeout(() => setSuccessEvent(null), 5000);
    }, 1000);
  };

  return (
    <div className="rounded-xl border border-rose-500/20 bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-rose-950/15">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-white text-base">Liquidation Risk & Solvency Radar</h2>
            <p className="text-xs text-muted">Real-time scanner for accounts approaching or below 1.00 Health Factor</p>
          </div>
        </div>
        <div className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono font-semibold">
          {positions.length} Active Targets Identified
        </div>
      </div>

      {successEvent && (
        <div className="m-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successEvent}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface/70 text-muted uppercase tracking-wider font-mono border-b border-border text-[11px]">
            <tr>
              <th className="py-3.5 px-6">Borrower Address</th>
              <th className="py-3.5 px-4">Collateral Asset</th>
              <th className="py-3.5 px-4">Debt Asset</th>
              <th className="py-3.5 px-4">Health Factor</th>
              <th className="py-3.5 px-4">Close Factor</th>
              <th className="py-3.5 px-4">Max Repayable Debt</th>
              <th className="py-3.5 px-4">Est. Seized Bonus</th>
              <th className="py-3.5 px-6 text-right">Liquidation Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border font-mono text-slate-200">
            {positions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted font-sans">
                  No accounts currently eligible for liquidation. All borrower health factors &gt; 1.10.
                </td>
              </tr>
            ) : (
              positions.map((pos) => {
                const isUnderOne = pos.healthFactor < 1.0;
                return (
                  <tr key={pos.userAddress} className="hover:bg-cardHover/60 transition-colors">
                    {/* Address */}
                    <td className="py-4 px-6 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-300">
                          {pos.userAddress.substring(0, 6)}...{pos.userAddress.substring(pos.userAddress.length - 4)}
                        </span>
                      </div>
                    </td>

                    {/* Collateral */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-white">
                        {pos.collateralAmount} {pos.collateralAsset}
                      </div>
                      <div className="text-[11px] text-muted">${pos.collateralUSD.toLocaleString()} USD</div>
                    </td>

                    {/* Debt */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-white">
                        {pos.debtAmount.toLocaleString()} {pos.debtAsset}
                      </div>
                      <div className="text-[11px] text-muted">${pos.debtUSD.toLocaleString()} USD</div>
                    </td>

                    {/* Health Factor */}
                    <td className="py-4 px-4">
                      <span
                        className={`font-bold text-sm px-2 py-0.5 rounded ${
                          isUnderOne
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-warning/20 text-warning border border-warning/30"
                        }`}
                      >
                        {pos.healthFactor.toFixed(3)}
                      </span>
                    </td>

                    {/* Close Factor */}
                    <td className="py-4 px-4">
                      <span className="text-slate-300 font-medium">
                        {(pos.closeFactor * 100).toFixed(0)}%
                      </span>
                      {pos.isExtreme && (
                        <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-400 font-sans">
                          EXTREME
                        </span>
                      )}
                    </td>

                    {/* Max Repayable */}
                    <td className="py-4 px-4 font-semibold text-white">
                      ${pos.maxRepayUSD.toLocaleString()} USD
                    </td>

                    {/* Seized Profit */}
                    <td className="py-4 px-4">
                      <span className="text-emerald-400 font-bold">
                        +${pos.estimatedProfitUSD.toLocaleString()} USD
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => handleExecuteLiquidation(pos)}
                        disabled={!isUnderOne || liquidatingUser === pos.userAddress}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-sans font-bold flex items-center space-x-1.5 ml-auto transition-all ${
                          !isUnderOne
                            ? "bg-surface text-muted border border-border cursor-not-allowed"
                            : liquidatingUser === pos.userAddress
                            ? "bg-rose-600/50 text-white cursor-wait"
                            : "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
                        }`}
                      >
                        {liquidatingUser === pos.userAddress ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Liquidating...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>{isUnderOne ? "Execute Liquidation" : "Safe (> 1.0 HF)"}</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
