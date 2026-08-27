"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ProtocolConcept } from "../../landing/types";

interface LiquidityCoreProps {
  activeConcept: ProtocolConcept;
  reducedMotion?: boolean;
}

export const LiquidityCore: React.FC<LiquidityCoreProps> = ({
  activeConcept,
  reducedMotion = false,
}) => {
  const outerGroupRef = useRef<THREE.Group>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const rayRing1Ref = useRef<THREE.Mesh>(null);
  const rayRing2Ref = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (reducedMotion) return;

    const time = state.clock.getElapsedTime();

    // 1. Slow, subtle rotation of structural prism
    if (outerGroupRef.current) {
      outerGroupRef.current.rotation.y = time * 0.15;
      outerGroupRef.current.rotation.x = Math.sin(time * 0.1) * 0.08;
    }

    // 2. Subtle Ray index rings counter-rotation
    if (rayRing1Ref.current) {
      rayRing1Ref.current.rotation.z = -time * 0.12;
    }
    if (rayRing2Ref.current) {
      rayRing2Ref.current.rotation.x = time * 0.1;
      rayRing2Ref.current.rotation.y = time * 0.08;
    }

    // 3. Organic breathing pulse of inner liquidity cash core
    if (innerCoreRef.current) {
      const isLiquidityActive = activeConcept === "liquidity";
      const isBorrowActive = activeConcept === "borrow";

      const baseScale = isLiquidityActive ? 1.12 : isBorrowActive ? 1.05 : 1.0;
      const pulse = Math.sin(time * 2.0) * 0.04;
      const targetScale = baseScale + pulse;

      innerCoreRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 4.0
      );
    }
  });

  const isLiquidityActive = activeConcept === "liquidity";
  const isBorrowActive = activeConcept === "borrow";
  const isRiskActive = activeConcept === "risk";

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Central Core Structural Assembly */}
      <group ref={outerGroupRef}>
        {/* Outer Frosted Crystalline Hull */}
        <mesh>
          <octahedronGeometry args={[1.3, 0]} />
          <meshPhysicalMaterial
            color={isLiquidityActive ? "#0ea5e9" : isBorrowActive ? "#38bdf8" : "#1e293b"}
            emissive={isLiquidityActive ? "#0284c7" : "#0f172a"}
            emissiveIntensity={isLiquidityActive ? 0.6 : 0.2}
            roughness={0.15}
            metalness={0.8}
            transmission={0.65}
            thickness={0.8}
            transparent
            opacity={0.75}
            wireframe={false}
          />
        </mesh>

        {/* Structural Edge Wireframe Lattice */}
        <mesh>
          <octahedronGeometry args={[1.305, 0]} />
          <meshBasicMaterial
            color={isLiquidityActive ? "#38bdf8" : isBorrowActive ? "#818cf8" : "#475569"}
            wireframe
            transparent
            opacity={isLiquidityActive ? 0.9 : 0.45}
          />
        </mesh>

        {/* Internal Liquid Core Sphere (Cash Reserve) */}
        <mesh ref={innerCoreRef}>
          <sphereGeometry args={[0.75, 32, 32]} />
          <meshStandardMaterial
            color={isLiquidityActive ? "#0284c7" : isBorrowActive ? "#0ea5e9" : "#0369a1"}
            emissive={isLiquidityActive ? "#38bdf8" : "#0ea5e9"}
            emissiveIntensity={isLiquidityActive ? 1.2 : 0.6}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>
      </group>

      {/* 2. Secondary Ray Index Precision Scale Ring (1e27 Accounting Telemetry) */}
      <mesh ref={rayRing1Ref} rotation={[Math.PI / 2.5, 0, 0]}>
        <ringGeometry args={[1.7, 1.72, 64]} />
        <meshBasicMaterial
          color={isBorrowActive ? "#38bdf8" : "#334155"}
          transparent
          opacity={isBorrowActive ? 0.8 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh ref={rayRing2Ref} rotation={[0, Math.PI / 3, 0]}>
        <ringGeometry args={[2.0, 2.02, 64]} />
        <meshBasicMaterial
          color={isRiskActive ? "#10b981" : "#1e293b"}
          transparent
          opacity={isRiskActive ? 0.75 : 0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. Concentric Reserve Floor Disc */}
      <mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 2.8, 48]} />
        <meshBasicMaterial
          color="#0f172a"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
};
