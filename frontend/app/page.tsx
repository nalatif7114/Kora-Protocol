"use client";

import React, { useState } from "react";
import { Navbar } from "../components/Navbar";
import { MetricsOverview } from "../components/MetricsOverview";
import { MarketsTable } from "../components/MarketsTable";
import { HealthFactorGauge } from "../components/HealthFactorGauge";
import { UserTerminal } from "../components/UserTerminal";
import { LiquidationRadar } from "../components/LiquidationRadar";
import {
  INITIAL_RESERVES,
  INITIAL_RADAR_POSITIONS,
  MarketReserve,
  VulnerablePosition,
} from "../lib/mockData";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"markets" | "terminal" | "radar">("markets");
  const [reserves, setReserves] = useState<MarketReserve[]>(INITIAL_RESERVES);
  const [selectedReserve, setSelectedReserve] = useState<MarketReserve>(INITIAL_RESERVES[0]);
  const [radarPositions, setRadarPositions] = useState<VulnerablePosition[]>(INITIAL_RADAR_POSITIONS);

  const [walletConnected, setWalletConnected] = useState<boolean>(true);
  const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // Hardhat Deployer / User Account

  // Calculate real-time user portfolio metrics
  const totalCollateralUSD = reserves.reduce((acc, r) => {
    return r.isCollateral ? acc + r.userSupplied * r.priceUSD : acc;
  }, 0);

  const weightedThresholdUSD = reserves.reduce((acc, r) => {
    return r.isCollateral ? acc + r.userSupplied * r.priceUSD * r.liquidationThreshold : acc;
  }, 0);

  const weightedLTVUSD = reserves.reduce((acc, r) => {
    return r.isCollateral ? acc + r.userSupplied * r.priceUSD * r.ltv : acc;
  }, 0);

  const totalDebtUSD = reserves.reduce((acc, r) => {
    return acc + r.userBorrowed * r.priceUSD;
  }, 0);

  const borrowPowerUSD = Math.max(0, weightedLTVUSD - totalDebtUSD);

  const healthFactor = totalDebtUSD === 0 ? 999 : weightedThresholdUSD / totalDebtUSD;

  // Handler for user transactions (Supply, Withdraw, Borrow, Repay)
  const handleExecuteAction = (
    action: "supply" | "withdraw" | "borrow" | "repay",
    symbol: string,
    amount: number
  ) => {
    setReserves((prev) =>
      prev.map((r) => {
        if (r.symbol !== symbol) return r;

        let newWallet = r.walletBalance;
        let newSupplied = r.userSupplied;
        let newBorrowed = r.userBorrowed;
        let newTotalSupplied = r.totalSupplied;
        let newTotalBorrowed = r.totalBorrowed;

        if (action === "supply") {
          newWallet = Math.max(0, newWallet - amount);
          newSupplied += amount;
          newTotalSupplied += amount;
        } else if (action === "withdraw") {
          newWallet += amount;
          newSupplied = Math.max(0, newSupplied - amount);
          newTotalSupplied = Math.max(0, newTotalSupplied - amount);
        } else if (action === "borrow") {
          newWallet += amount;
          newBorrowed += amount;
          newTotalBorrowed += amount;
        } else if (action === "repay") {
          newWallet = Math.max(0, newWallet - amount);
          newBorrowed = Math.max(0, newBorrowed - amount);
          newTotalBorrowed = Math.max(0, newTotalBorrowed - amount);
        }

        const newAvailable = Math.max(0, newTotalSupplied - newTotalBorrowed);
        const newUtil = newTotalSupplied > 0 ? newTotalBorrowed / newTotalSupplied : 0;

        return {
          ...r,
          walletBalance: newWallet,
          userSupplied: newSupplied,
          userBorrowed: newBorrowed,
          totalSupplied: newTotalSupplied,
          totalBorrowed: newTotalBorrowed,
          availableLiquidity: newAvailable,
          utilizationRate: newUtil,
        };
      })
    );
  };

  // Quick Action selection from Markets Table
  const handleSelectFromTable = (reserve: MarketReserve, action: "supply" | "borrow") => {
    setSelectedReserve(reserve);
    setActiveTab("terminal");
  };

  // Handler for executing a liquidation from the radar
  const handleLiquidateRadarPosition = (pos: VulnerablePosition) => {
    setRadarPositions((prev) => prev.filter((p) => p.userAddress !== pos.userAddress));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100 font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        walletConnected={walletConnected}
        connectWallet={() => setWalletConnected(!walletConnected)}
        userAddress={userAddress}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Global Protocol Metrics */}
        <MetricsOverview reserves={reserves} />

        {/* Tab 1: Markets Overview */}
        {activeTab === "markets" && (
          <div className="space-y-8">
            <HealthFactorGauge
              healthFactor={healthFactor}
              totalCollateralUSD={totalCollateralUSD}
              totalDebtUSD={totalDebtUSD}
              borrowPowerUSD={borrowPowerUSD}
            />
            <MarketsTable reserves={reserves} onSelectReserve={handleSelectFromTable} />
          </div>
        )}

        {/* Tab 2: Position Terminal */}
        {activeTab === "terminal" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              <HealthFactorGauge
                healthFactor={healthFactor}
                totalCollateralUSD={totalCollateralUSD}
                totalDebtUSD={totalDebtUSD}
                borrowPowerUSD={borrowPowerUSD}
              />
              <div className="rounded-xl border border-border bg-card p-5 space-y-3 text-xs">
                <h4 className="font-semibold text-white">Your Supplied Assets</h4>
                <div className="divide-y divide-border font-mono">
                  {reserves
                    .filter((r) => r.userSupplied > 0)
                    .map((r) => (
                      <div key={r.symbol} className="py-2.5 flex justify-between items-center">
                        <div>
                          <span className="font-bold text-white">{r.symbol}</span>
                          <span className="text-muted ml-2">{r.userSupplied} {r.symbol}</span>
                        </div>
                        <span className="text-emerald-400 font-bold">
                          ${(r.userSupplied * r.priceUSD).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <UserTerminal
                reserves={reserves}
                selectedReserve={selectedReserve}
                setSelectedReserve={setSelectedReserve}
                onExecuteAction={handleExecuteAction}
                currentHealthFactor={healthFactor}
              />
            </div>
          </div>
        )}

        {/* Tab 3: Liquidation Radar */}
        {activeTab === "radar" && (
          <div className="space-y-8">
            <LiquidationRadar
              positions={radarPositions}
              onLiquidate={handleLiquidateRadarPosition}
            />
          </div>
        )}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-border bg-surface/50 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted">
          <div>
            <span>Kora Protocol © 2026. Institutional Risk-Aware Lending Architecture.</span>
          </div>
          <div className="flex space-x-6 font-mono text-[11px] mt-3 sm:mt-0">
            <span>EVM PARIS</span>
            <span>RAY 1e27 PRECISION</span>
            <span>DIRECTIONAL ROUNDING</span>
            <span>MULTI-TIER ORACLES</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
