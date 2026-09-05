"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ProtocolConcept } from "../../landing/types";

interface LiquidityCoreProps {
  activeConcept: ProtocolConcept;
  storyProgress?: number;
  reducedMotion?: boolean;
}

export const LiquidityCore: React.FC<LiquidityCoreProps> = ({
  activeConcept,
  storyProgress = 0,
  reducedMotion = false,
}) => {
  const outerGroupRef = useRef<THREE.Group>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const rayRing1Ref = useRef<THREE.Mesh>(null);
  const rayRing2Ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (reducedMotion) return;

    // 1. Calm, dignified idle movement + scroll-driven scrubbing
    // Instead of high-speed infinite spinning, the rotation is tied smoothly to narrative scroll progress
    const scrollAngle = storyProgress * Math.PI * 0.85;
    const timeDrift = state.clock.getElapsedTime() * 0.02; // Very gentle ambient drift (0.02 rad/s)

    if (outerGroupRef.current) {
      outerGroupRef.current.rotation.y = scrollAngle + timeDrift;
      outerGroupRef.current.rotation.x = Math.sin(scrollAngle * 0.5) * 0.06;
    }

    // 2. Ray rings rotate calmly in response to scroll scrubbing
    if (rayRing1Ref.current) {
      rayRing1Ref.current.rotation.z = -scrollAngle * 0.7 - timeDrift * 0.5;
    }
    if (rayRing2Ref.current) {
      rayRing2Ref.current.rotation.x = scrollAngle * 0.5;
      rayRing2Ref.current.rotation.y = scrollAngle * 0.6;
    }

    // 3. Calm, purposeful scale adaptation
    if (innerCoreRef.current) {
      const isLiquidity = activeConcept === "liquidity";
      const isInterest = activeConcept === "interest";
      const isBorrow = activeConcept === "borrow";

      const targetScale = isLiquidity ? 1.14 : isInterest ? 1.08 : isBorrow ? 1.04 : 1.0;

      innerCoreRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 3.5
      );
    }
  });

  const isLiquidityActive = activeConcept === "liquidity";
  const isInterestActive = activeConcept === "interest";
  const isBorrowActive = activeConcept === "borrow";
  const isRiskActive = activeConcept === "risk" || activeConcept === "security";

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Central Core Structural Assembly */}
      <group ref={outerGroupRef}>
        {/* Outer Frosted Crystalline Hull */}
        <mesh>
          <octahedronGeometry args={[1.3, 0]} />
          <meshPhysicalMaterial
            color={isLiquidityActive ? "#0ea5e9" : isInterestActive ? "#38bdf8" : "#1e293b"}
            emissive={isLiquidityActive ? "#0284c7" : isInterestActive ? "#0369a1" : "#0f172a"}
            emissiveIntensity={isLiquidityActive ? 0.7 : isInterestActive ? 0.5 : 0.2}
            roughness={0.2}
            metalness={0.8}
            transmission={0.6}
            thickness={0.8}
            transparent
            opacity={0.8}
            wireframe={false}
          />
        </mesh>

        {/* Structural Edge Wireframe Lattice */}
        <mesh>
          <octahedronGeometry args={[1.305, 0]} />
          <meshBasicMaterial
            color={isLiquidityActive ? "#38bdf8" : isInterestActive ? "#7dd3fc" : "#475569"}
            wireframe
            transparent
            opacity={isLiquidityActive || isInterestActive ? 0.9 : 0.4}
          />
        </mesh>

        {/* Internal Liquid Core Sphere (Cash Reserve) */}
        <mesh ref={innerCoreRef}>
          <sphereGeometry args={[0.75, 32, 32]} />
          <meshStandardMaterial
            color={isLiquidityActive ? "#0284c7" : isBorrowActive ? "#0ea5e9" : "#0369a1"}
            emissive={isLiquidityActive ? "#38bdf8" : isInterestActive ? "#38bdf8" : "#0ea5e9"}
            emissiveIntensity={isLiquidityActive ? 1.2 : isInterestActive ? 1.0 : 0.5}
            roughness={0.25}
            metalness={0.5}
          />
        </mesh>
      </group>

      {/* 2. Secondary Ray Index Precision Scale Rings (1e27 Accounting Telemetry) */}
      <mesh ref={rayRing1Ref} rotation={[Math.PI / 2.5, 0, 0]}>
        <ringGeometry args={[1.7, 1.72, 64]} />
        <meshBasicMaterial
          color={isInterestActive ? "#38bdf8" : isBorrowActive ? "#0ea5e9" : "#334155"}
          transparent
          opacity={isInterestActive ? 0.9 : isBorrowActive ? 0.6 : 0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={rayRing2Ref} rotation={[0, Math.PI / 3, 0]}>
        <ringGeometry args={[2.0, 2.02, 64]} />
        <meshBasicMaterial
          color={isRiskActive ? "#10b981" : isInterestActive ? "#0ea5e9" : "#1e293b"}
          transparent
          opacity={isRiskActive ? 0.8 : isInterestActive ? 0.5 : 0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Concentric Reserve Floor Disc */}
      <mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 2.8, 48]} />
        <meshBasicMaterial
          color="#0f172a"
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
