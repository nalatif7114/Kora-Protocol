"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { HeroCopy } from "./HeroCopy";
import { HeroCTA } from "./HeroCTA";
import { ProtocolConcept } from "./types";

// Dynamic import of 3D Canvas to guarantee no SSR hydration issues and optimal initial paint
const KoraHeroCanvas = dynamic(
  () =>
    import("../three/hero/KoraHeroCanvas").then((mod) => mod.KoraHeroCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[420px] sm:h-[500px] lg:h-[560px] rounded-2xl border border-border bg-card/40 animate-pulse flex items-center justify-center font-mono text-xs text-muted">
        LOADING 3D INFRASTRUCTURE MODEL...
      </div>
    ),
  }
);

interface KoraHeroProps {
  onLaunchApp?: () => void;
  onExploreProtocol?: () => void;
}

export const KoraHero: React.FC<KoraHeroProps> = ({
  onLaunchApp,
  onExploreProtocol,
}) => {
  const [activeConcept, setActiveConcept] = useState<ProtocolConcept>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-16 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* Left Column: Hero Content & CTAs (5 Cols on Large screens) */}
        <div className="lg:col-span-5 space-y-6 z-10">
          <HeroCopy />
          <HeroCTA
            activeConcept={activeConcept}
            onHoverConcept={setActiveConcept}
            onLaunchApp={onLaunchApp}
            onExploreProtocol={onExploreProtocol}
          />
        </div>

        {/* Right Column: Interactive 3D Protocol Infrastructure (7 Cols) */}
        <div className="lg:col-span-7 w-full">
          <KoraHeroCanvas
            activeConcept={activeConcept}
            hoveredNodeId={hoveredNodeId}
            onHoverNode={setHoveredNodeId}
            onHoverConcept={setActiveConcept}
          />
        </div>
      </div>
    </section>
  );
};
