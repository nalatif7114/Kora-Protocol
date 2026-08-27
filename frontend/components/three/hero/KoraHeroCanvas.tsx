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
      <div className="w-full h-[420px] sm:h-[500px] lg:h-[560px] rounded-2xl border border-border bg-card/40 animate-pulse" />
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

  return (
    <div
      role="img"
      aria-label="Kora Institutional 3D Lending Infrastructure Model. Shows liquidity pools, collateral matrix, borrow hubs, and risk perimeter."
      className="relative w-full h-[420px] sm:h-[500px] lg:h-[560px] rounded-2xl overflow-hidden border border-border/80 bg-gradient-to-b from-card/30 via-background to-card/20 backdrop-blur-sm"
    >
      {/* Background Architectural Grid Accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b50_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none opacity-40" />

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
            position: [0, 0, 8.5],
          }}
          className="w-full h-full"
        >
          <KoraHeroScene
            activeConcept={activeConcept}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={onHoverNode}
            reducedMotion={reducedMotion}
          />
        </Canvas>
      </Suspense>

      {/* Floating 3D HUD Telemetry Overlay */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none text-[10px] font-mono text-muted/80 border-t border-border/40 pt-2">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>RAY 1e27 PRECISION MATRIX</span>
        </div>
        <div className="hidden sm:block">
          POINTER PARALLAX ACTIVE
        </div>
      </div>
    </div>
  );
};
