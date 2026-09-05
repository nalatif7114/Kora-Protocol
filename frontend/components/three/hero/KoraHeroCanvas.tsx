"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { KoraHeroScene } from "./KoraHeroScene";
import { HeroSceneFallback } from "./HeroSceneFallback";
import { ProtocolConcept } from "../../landing/types";

interface KoraHeroCanvasProps {
  activeConcept: ProtocolConcept;
  hoveredNodeId: string | null;
  onHoverNode: (nodeId: string | null) => void;
  onHoverConcept: (concept: ProtocolConcept) => void;
  storyProgress?: number;
  isScrolling?: boolean;
  activeChapterTitle?: string;
  activeChapterNumber?: string;
  className?: string;
}

function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export const KoraHeroCanvas: React.FC<KoraHeroCanvasProps> = ({
  activeConcept,
  hoveredNodeId,
  onHoverNode,
  onHoverConcept,
  storyProgress = 0,
  isScrolling = false,
  activeChapterTitle,
  activeChapterNumber,
  className = "",
}) => {
  const [webglAvailable, setWebglAvailable] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setWebglAvailable(checkWebGLSupport());

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleMotionChange);
    return () => mediaQuery.removeEventListener("change", handleMotionChange);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-full h-full min-h-[440px] rounded-2xl border border-border bg-card/40 animate-pulse ${className}`} />
    );
  }

  if (!webglAvailable) {
    return (
      <HeroSceneFallback
        activeConcept={activeConcept}
        onHoverConcept={onHoverConcept}
      />
    );
  }

  // Informative protocol telemetry status based on active subsystem
  const hudStatus =
    activeConcept === "liquidity"
      ? "CORE INFLOW ROUTING · USDC · WETH · WBTC RESERVES"
      : activeConcept === "collateral"
      ? "RISK MATRIX ACTIVE · 75% MAX LTV · 80% THRESHOLD"
      : activeConcept === "borrow"
      ? "TWO-KINK RATE ENGINE · 67.2% UTILIZATION DEPTH"
      : activeConcept === "interest"
      ? "RAY INDEX ACCRUAL · 1e27 FIXED-POINT PRECISION"
      : activeConcept === "risk"
      ? "HEALTH FACTOR 1.84 · DYNAMIC SOLVENCY VERIFIED"
      : activeConcept === "security"
      ? "SOLVENCY DEFENSE · TIERED LIQUIDATION ENGINE"
      : "KORA PROTOCOL · MODULAR LENDING INFRASTRUCTURE";

  return (
    <div
      role="img"
      aria-label="Kora Institutional 3D Lending Infrastructure Model. Visualizes liquidity pools, collateral matrix, dynamic borrow rates, continuous ray index compounding, and risk perimeter."
      className={`relative w-full h-full min-h-[440px] sm:min-h-[520px] lg:min-h-[600px] rounded-2xl overflow-hidden border border-border/70 bg-gradient-to-b from-card/30 via-background to-card/20 backdrop-blur-sm shadow-2xl shadow-black/40 ${className}`}
    >
      {/* Background Architectural Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b40_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-50" />

      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center font-mono text-xs text-muted">
            <span className="animate-pulse">INITIALIZING 3D ENGINE...</span>
          </div>
        }
      >
        <Canvas
          dpr={[1, 2]}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          }}
          camera={{
            fov: 45,
            near: 0.1,
            far: 50,
            position: [0.5, 0.2, 8.5],
          }}
          className="w-full h-full"
        >
          <KoraHeroScene
            activeConcept={activeConcept}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={onHoverNode}
            storyProgress={storyProgress}
            isScrolling={isScrolling}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </Suspense>

      {/* Floating 3D HUD Telemetry Overlay */}
      <div className="absolute bottom-3.5 left-4 right-4 flex items-center justify-between pointer-events-none text-[10px] font-mono text-muted/90 border-t border-border/50 pt-2.5">
        <div className="flex items-center space-x-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              activeConcept === "risk" || activeConcept === "security"
                ? "bg-emerald-400 animate-pulse"
                : "bg-accent"
            }`}
          />
          <span className="text-slate-200 font-semibold tracking-wider">
            {hudStatus}
          </span>
        </div>
        <div className="hidden sm:block text-slate-400 font-mono text-[9px] tracking-wider">
          LIVE 3D INFRASTRUCTURE MODEL
        </div>
      </div>
    </div>
  );
};
