"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ProtocolConcept } from "../../landing/types";

interface RiskPerimeterProps {
  activeConcept: ProtocolConcept;
  storyProgress?: number;
  reducedMotion?: boolean;
}

export const RiskPerimeter: React.FC<RiskPerimeterProps> = ({
  activeConcept,
  storyProgress = 0,
  reducedMotion = false,
}) => {
  const beaconGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const isRiskActive = activeConcept === "risk" || activeConcept === "security";

  useFrame((state, delta) => {
    if (reducedMotion) return;

    // Fixed, stable orientation without continuous wobble
    if (beaconGroupRef.current) {
      // Sentinels advance with scroll scrubbing rather than infinite spinning
      const targetRotation = storyProgress * Math.PI * 1.2;
      beaconGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        beaconGroupRef.current.rotation.z,
        targetRotation,
        delta * 3.0
      );
    }
  });

  return (
    <group position={[0, 0, -0.5]}>
      {/* 1. Large Elliptical Guardrail Perimeter Ring (Fixed stable tilt) */}
      <mesh ref={ringRef} rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[4.4, 4.43, 64]} />
        <meshBasicMaterial
          color={isRiskActive ? "#10b981" : "#1e293b"}
          transparent
          opacity={isRiskActive ? 0.9 : 0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Three Orbital Sentinel Beacons (Oracles, Solvency, Risk) */}
      <group ref={beaconGroupRef}>
        {[0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].map((angle, index) => {
          const radius = 4.415;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle) * 0.45; // Elliptical inclination
          return (
            <mesh key={index} position={[x, y, 0]}>
              <octahedronGeometry args={[isRiskActive ? 0.15 : 0.1, 0]} />
              <meshBasicMaterial
                color={isRiskActive ? "#10b981" : "#0ea5e9"}
                transparent
                opacity={isRiskActive ? 1.0 : 0.5}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};
