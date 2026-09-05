import { StoryChapter } from "./types";

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: "overview",
    concept: "overview",
    chapterNumber: "00",
    eyebrow: "KORA PROTOCOL · INSTITUTIONAL LENDING",
    headline: "Lending, Engineered.",
    subheadline:
      "Institutional DeFi infrastructure with transparent risk, adaptive rate curves, and deterministic settlement.",
    description:
      "A modular money market architecture featuring constant-time scaled balance accounting, dynamic two-kink rate curves, and automated risk protection.",
    primaryMetric: {
      label: "TOTAL LIQUIDITY SUPPLIED",
      value: "$50.1M",
      detail: "100% Solvency Verified",
    },
    secondaryMetrics: [
      { label: "ACTIVE BORROWS", value: "$18.7M" },
      { label: "INDEX PRECISION", value: "1e27 Ray" },
    ],
    scrollRange: [0.0, 0.15],
    cameraTarget: [0.5, 0.2, 8.5],
    cameraLookAt: [0, 0, 0],
  },
  {
    id: "liquidity",
    concept: "liquidity",
    chapterNumber: "01",
    eyebrow: "01 · LIQUIDITY RESERVES",
    headline: "Liquidity becomes productive.",
    subheadline: "Deterministic share accounting with zero idle capital.",
    description:
      "Deposited capital is absorbed into unified reserve pools, continuously compounding via scaled balance indices without gas spikes or unbound loops.",
    primaryMetric: {
      label: "USDC SUPPLY APY",
      value: "4.68%",
      detail: "At 67.2% Pool Utilization",
    },
    secondaryMetrics: [
      { label: "WETH RESERVE", value: "3.85% APY" },
      { label: "WBTC RESERVE", value: "2.95% APY" },
    ],
    scrollRange: [0.15, 0.3],
    cameraTarget: [-1.5, -0.2, 6.8],
    cameraLookAt: [-1.2, -0.1, 0],
  },
  {
    id: "collateral",
    concept: "collateral",
    chapterNumber: "02",
    eyebrow: "02 · COLLATERAL MATRIX",
    headline: "Over-collateralized by design.",
    subheadline: "Isolated risk tiers with deterministic borrowing power.",
    description:
      "Supplied assets unlock conservative borrowing capacity governed by asset-level Loan-to-Value ratios and multi-tier liquidation thresholds.",
    primaryMetric: {
      label: "MAX COLLATERAL LTV",
      value: "75.0%",
      detail: "Tier 1 Collateral (WETH)",
    },
    secondaryMetrics: [
      { label: "LIQ THRESHOLD", value: "80.0%" },
      { label: "LIQUIDATION BONUS", value: "5.0%" },
    ],
    scrollRange: [0.3, 0.45],
    cameraTarget: [1.6, 0.8, 6.5],
    cameraLookAt: [1.8, 0.8, 0],
  },
  {
    id: "borrow",
    concept: "borrow",
    chapterNumber: "03",
    eyebrow: "03 · DYNAMIC RATE ENGINE",
    headline: "Rates that adapt to liquidity.",
    subheadline: "Two-kink model engineered to protect liquidity depth.",
    description:
      "Borrow costs stay low below the 80% optimal kink, then accelerate sharply beyond it to incentivize repayments and safeguard pool depth.",
    primaryMetric: {
      label: "CURRENT BORROW APR",
      value: "5.82%",
      detail: "Base 2% + Slope 4% Curve",
    },
    secondaryMetrics: [
      { label: "OPTIMAL KINK", value: "80.0%" },
      { label: "SURGE SLOPE", value: "75.0%" },
    ],
    scrollRange: [0.45, 0.6],
    cameraTarget: [1.6, -0.8, 6.5],
    cameraLookAt: [1.8, -0.8, 0],
  },
  {
    id: "interest",
    concept: "interest",
    chapterNumber: "04",
    eyebrow: "04 · CONTINUOUS ACCRUAL",
    headline: "Continuous mathematical certainty.",
    subheadline: "Linear compounding calculated at 1e27 Ray precision.",
    description:
      "Debt and interest accrue every second using 27-decimal fixed-point arithmetic with protocol-favorable directional rounding.",
    primaryMetric: {
      label: "ACCOUNTING PRECISION",
      value: "1e27 Ray",
      detail: "Per-Second Index Accrual",
    },
    secondaryMetrics: [
      { label: "ROUNDING BIAS", value: "Protocol-Favorable" },
      { label: "INDEX UPDATE", value: "O(1) Constant Time" },
    ],
    scrollRange: [0.6, 0.75],
    cameraTarget: [0.0, 0.0, 5.8],
    cameraLookAt: [0, 0, 0],
  },
  {
    id: "risk",
    concept: "risk",
    chapterNumber: "05",
    eyebrow: "05 · REAL-TIME RISK GUARDS",
    headline: "Continuous solvency verification.",
    subheadline: "Real-time health factors backed by multi-source pricing.",
    description:
      "Every position is continually measured against conservative liquidation boundaries with strict oracle staleness checks and circuit breakers.",
    primaryMetric: {
      label: "PROTOCOL HEALTH FACTOR",
      value: "1.84",
      detail: "Safely Above 1.00 Threshold",
    },
    secondaryMetrics: [
      { label: "MAX STALENESS", value: "3600s Heartbeat" },
      { label: "ORACLE STATUS", value: "Verified Active" },
    ],
    scrollRange: [0.75, 0.9],
    cameraTarget: [0.0, 1.4, 9.2],
    cameraLookAt: [0, 0, 0],
  },
  {
    id: "security",
    concept: "security",
    chapterNumber: "06",
    eyebrow: "06 · LIQUIDATION DEFENSE",
    headline: "Dynamic liquidation defense.",
    subheadline: "Tiered close factors to prevent bad debt cascades.",
    description:
      "Underwater positions are auctioned with a 50% close factor, expanding to 100% for severe deficits to extinguish bad debt immediately.",
    primaryMetric: {
      label: "DYNAMIC CLOSE FACTOR",
      value: "50% / 100%",
      detail: "Two-Tier Solvency Defense",
    },
    secondaryMetrics: [
      { label: "EMERGENCY PAUSE", value: "Asset-Level" },
      { label: "REENTRANCY GUARD", value: "OpenZeppelin v5" },
    ],
    ctaText: "Launch App",
    scrollRange: [0.9, 1.0],
    cameraTarget: [0.0, 0.0, 8.2],
    cameraLookAt: [0, 0, 0],
  },
];
