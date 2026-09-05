export type ProtocolConcept =
  | "overview"
  | "liquidity"
  | "collateral"
  | "borrow"
  | "interest"
  | "risk"
  | "security"
  | null;

export interface NodeTelemetry {
  id: string;
  name: string;
  symbol: string;
  type: "asset" | "core" | "collateral" | "borrow" | "risk";
  valueUSD: string;
  rate: string;
  utilization?: string;
  ltv?: string;
  status: string;
  position: [number, number, number];
}

export interface StoryChapter {
  id: string;
  concept: ProtocolConcept;
  chapterNumber: string; // "01", "02", etc.
  eyebrow: string;
  headline: string;
  subheadline?: string;
  description: string;
  primaryMetric: {
    label: string;
    value: string;
    detail?: string;
  };
  secondaryMetrics?: {
    label: string;
    value: string;
  }[];
  ctaText?: string;
  scrollRange: [number, number]; // [startProgress, endProgress]
  cameraTarget: [number, number, number];
  cameraLookAt: [number, number, number];
}

export interface HeroState {
  activeConcept: ProtocolConcept;
  hoveredNodeId: string | null;
  reducedMotion: boolean;
  webglSupported: boolean;
  storyProgress: number;
}
