"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ProtocolConcept } from "../../landing/types";

interface RiskPerimeterProps {
  activeConcept: ProtocolConcept;
  reducedMotion?: boolean;
}

export const RiskPerimeter: React.FC<RiskPerimeterProps> = ({
  activeConcept,
  reducedMotion = false,
}) => {
  const beaconGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const isRiskActive = activeConcept === "risk";

  useFrame((state, delta) => {
    if (reducedMotion) return;

    const time = state.clock.getElapsedTime();

    if (beaconGroupRef.current) {
      beaconGroupRef.current.rotation.z = time * 0.1;
    }

    if (ringRef.current) {
      // Subtle tilt
      ringRef.current.rotation.x = Math.PI / 2.2 + Math.sin(time * 0.2) * 0.03;
    }
  });

  return (
    <group position={[0, 0, -0.5]}>
      {/* 1. Large Elliptical Guardrail Perimeter Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2.2, 0, 0]}>
        <ringGeometry args={[4.4, 4.43, 64]} />
        <meshBasicMaterial
          color={isRiskActive ? "#10b981" : "#1e293b"}
          transparent
          opacity={isRiskActive ? 0.9 : 0.4}
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
              <octahedronGeometry args={[0.12, 0]} />
              <meshBasicMaterial
                color={isRiskActive ? "#10b981" : "#0ea5e9"}
                transparent
                opacity={isRiskActive ? 1.0 : 0.75}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};
