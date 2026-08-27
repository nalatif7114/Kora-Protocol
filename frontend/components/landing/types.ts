export type ProtocolConcept = "liquidity" | "borrow" | "risk" | "collateral" | null;

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

export interface HeroState {
  activeConcept: ProtocolConcept;
  hoveredNodeId: string | null;
  reducedMotion: boolean;
  webglSupported: boolean;
}
