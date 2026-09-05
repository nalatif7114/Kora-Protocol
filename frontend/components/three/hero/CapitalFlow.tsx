"use client";

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { ProtocolConcept } from "../../landing/types";

interface CapitalFlowProps {
  activeConcept: ProtocolConcept;
  storyProgress?: number;
  reducedMotion?: boolean;
}

interface FlowTrajectory {
  id: string;
  curve: THREE.QuadraticBezierCurve3;
  type: "supply" | "collateral" | "borrow";
  particleCount: number;
}

export const CapitalFlow: React.FC<CapitalFlowProps> = ({
  activeConcept,
  storyProgress = 0,
  reducedMotion = false,
}) => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempPos = useMemo(() => new THREE.Vector3(), []);
  const tempScale = useMemo(() => new THREE.Vector3(), []);

  // 1. Define mathematically smooth capital flow curves
  const trajectories: FlowTrajectory[] = useMemo(() => {
    return [
      // Supply Inflows (USDC, WETH, WBTC -> Core)
      {
        id: "supply-usdc",
        curve: new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-2.9, -1.2, 0.4),
          new THREE.Vector3(-1.4, -0.6, 0.8),
          new THREE.Vector3(0, 0, 0)
        ),
        type: "supply",
        particleCount: 5,
      },
      {
        id: "supply-weth",
        curve: new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-3.1, 1.3, -0.2),
          new THREE.Vector3(-1.5, 0.9, 0.4),
          new THREE.Vector3(0, 0, 0)
        ),
        type: "supply",
        particleCount: 5,
      },
      {
        id: "supply-wbtc",
        curve: new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-3.3, 0.1, 0.6),
          new THREE.Vector3(-1.6, 0.2, 0.7),
          new THREE.Vector3(0, 0, 0)
        ),
        type: "supply",
        particleCount: 5,
      },
      // Collateral Path (Core -> Collateral Node)
      {
        id: "collateral-flow",
        curve: new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(1.5, 0.9, 0.6),
          new THREE.Vector3(2.9, 1.4, 0.2)
        ),
        type: "collateral",
        particleCount: 5,
      },
      // Borrow Outflow (Core -> Borrow Hub)
      {
        id: "borrow-flow",
        curve: new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(1.4, -0.7, 0.7),
          new THREE.Vector3(2.9, -1.3, 0.4)
        ),
        type: "borrow",
        particleCount: 5,
      },
    ];
  }, []);

  const totalParticles = useMemo(
    () => trajectories.reduce((acc, t) => acc + t.particleCount, 0),
    [trajectories]
  );

  // 2. Pre-generate curve points for Drei Line components
  const linePoints = useMemo(() => {
    return trajectories.map((traj) => {
      const pts = traj.curve.getPoints(32).map((p) => [p.x, p.y, p.z] as [number, number, number]);
      return { id: traj.id, points: pts, type: traj.type };
    });
  }, [trajectories]);

  // 3. Frame loop animating InstancedMesh particles
  useFrame((state) => {
    if (!instancedMeshRef.current) return;

    const elapsedTime = state.clock.getElapsedTime();
    let instanceIndex = 0;

    for (const traj of trajectories) {
      const isSupply = traj.type === "supply";
      const isBorrow = traj.type === "borrow";
      const isCollateral = traj.type === "collateral";

      // Focused speed: calm idle trickle unless specifically active
      const isFocused =
        (isSupply && activeConcept === "liquidity") ||
        (isBorrow && activeConcept === "borrow") ||
        (isCollateral && activeConcept === "collateral") ||
        activeConcept === "interest";

      const speedMultiplier = isFocused ? 0.9 : 0.15; // 0.15 is calm trickle, 0.9 is active purposeful transit
      const particleScale = isFocused ? 0.07 : 0.038;

      tempScale.set(particleScale, particleScale, particleScale);

      for (let i = 0; i < traj.particleCount; i++) {
        const offset = i / traj.particleCount;
        // In reduced motion, particles stay frozen at clean intervals
        const progress = reducedMotion
          ? offset
          : (elapsedTime * 0.25 * speedMultiplier + offset + storyProgress * 0.2) % 1.0;

        traj.curve.getPoint(progress, tempPos);

        tempMatrix.makeScale(tempScale.x, tempScale.y, tempScale.z);
        tempMatrix.setPosition(tempPos);

        instancedMeshRef.current.setMatrixAt(instanceIndex, tempMatrix);
        instanceIndex++;
      }
    }

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Static Precision Line Filaments */}
      {linePoints.map((line) => {
        const isHighlight =
          (line.type === "supply" && activeConcept === "liquidity") ||
          (line.type === "borrow" && activeConcept === "borrow") ||
          (line.type === "collateral" && activeConcept === "collateral") ||
          activeConcept === "interest";

        const lineColor =
          line.type === "supply"
            ? isHighlight ? "#10b981" : "#0284c7"
            : line.type === "borrow"
            ? isHighlight ? "#38bdf8" : "#0369a1"
            : isHighlight ? "#06b6d4" : "#1e293b";

        return (
          <Line
            key={line.id}
            points={line.points}
            color={lineColor}
            lineWidth={isHighlight ? 1.5 : 0.8}
            transparent
            opacity={isHighlight ? 0.85 : 0.25}
          />
        );
      })}

      {/* Instanced Dynamic Capital Pulse Particles */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[undefined, undefined, totalParticles]}
      >
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color={
            activeConcept === "liquidity"
              ? "#10b981"
              : activeConcept === "borrow"
              ? "#38bdf8"
              : activeConcept === "collateral"
              ? "#06b6d4"
              : "#0ea5e9"
          }
        />
      </instancedMesh>
    </group>
  );
};
