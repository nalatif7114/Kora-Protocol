"use client";

import React from "react";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { HeroCamera } from "./HeroCamera";
import { LiquidityCore } from "./LiquidityCore";
import { ProtocolNodes } from "./ProtocolNodes";
import { CapitalFlow } from "./CapitalFlow";
import { RiskPerimeter } from "./RiskPerimeter";
import { ProtocolConcept } from "../../landing/types";

interface KoraHeroSceneProps {
  activeConcept: ProtocolConcept;
  hoveredNodeId: string | null;
  onHoverNode: (nodeId: string | null) => void;
  reducedMotion?: boolean;
}

export const KoraHeroScene: React.FC<KoraHeroSceneProps> = ({
  activeConcept,
  hoveredNodeId,
  onHoverNode,
  reducedMotion = false,
}) => {
  return (
    <>
      {/* 1. Camera Parallax & Responsive Rig */}
      <HeroCamera reducedMotion={reducedMotion} />

      {/* 2. Restrained Institutional Lighting */}
      <ambientLight intensity={0.65} />
      <directionalLight
        position={[6, 8, 7]}
        intensity={1.1}
        color="#f8fafc"
      />
      <directionalLight
        position={[-6, -4, -5]}
        intensity={0.4}
        color="#0ea5e9"
      />
      <pointLight
        position={[0, 0, 0]}
        intensity={activeConcept === "liquidity" ? 2.2 : 1.4}
        color={activeConcept === "liquidity" ? "#10b981" : "#0284c7"}
        distance={6}
      />

      {/* 3. Primary 3D Protocol Infrastructure Nodes */}
      <group position={[0, 0, 0]}>
        <LiquidityCore activeConcept={activeConcept} reducedMotion={reducedMotion} />
        <ProtocolNodes
          activeConcept={activeConcept}
          hoveredNodeId={hoveredNodeId}
          onHoverNode={onHoverNode}
          reducedMotion={reducedMotion}
        />
        <CapitalFlow activeConcept={activeConcept} reducedMotion={reducedMotion} />
        <RiskPerimeter activeConcept={activeConcept} reducedMotion={reducedMotion} />
      </group>

      {/* 4. Restrained Post-Processing (Crisp geometry, subtle bloom) */}
      {!reducedMotion && (
        <EffectComposer multisampling={4}>
          <Bloom
            luminanceThreshold={0.88}
            luminanceSmoothing={0.2}
            intensity={0.4}
            radius={0.3}
          />
          <Vignette
            eskil={false}
            offset={0.25}
            darkness={0.6}
          />
        </EffectComposer>
      )}
    </>
  );
};
