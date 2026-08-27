"use client";

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { ProtocolConcept, NodeTelemetry } from "../../landing/types";

interface ProtocolNodesProps {
  activeConcept: ProtocolConcept;
  hoveredNodeId: string | null;
  onHoverNode: (nodeId: string | null) => void;
  reducedMotion?: boolean;
}

export const NODES_DATA: NodeTelemetry[] = [
  {
    id: "usdc",
    name: "USD Coin Reserve",
    symbol: "USDC",
    type: "asset",
    valueUSD: "$12.5M",
    rate: "4.68% APY",
    utilization: "67.2%",
    status: "ACTIVE POOL",
    position: [-2.9, -1.2, 0.4],
  },
  {
    id: "weth",
    name: "Wrapped Ether Reserve",
    symbol: "WETH",
    type: "asset",
    valueUSD: "$13.2M",
    rate: "3.85% APY",
    utilization: "61.9%",
    ltv: "75% Max LTV",
    status: "COLLATERAL TIER 1",
    position: [-3.1, 1.3, -0.2],
  },
  {
    id: "wbtc",
    name: "Wrapped Bitcoin",
    symbol: "WBTC",
    type: "asset",
    valueUSD: "$24.4M",
    rate: "2.95% APY",
    utilization: "55.2%",
    ltv: "70% Max LTV",
    status: "COLLATERAL TIER 1",
    position: [-3.3, 0.1, 0.6],
  },
  {
    id: "collateral",
    name: "Collateral Matrix",
    symbol: "LTV/LT",
    type: "collateral",
    valueUSD: "$35.6M",
    rate: "80.0% LT",
    ltv: "75.0% LTV",
    status: "RISK-PROTECTED",
    position: [2.9, 1.4, 0.2],
  },
  {
    id: "borrow",
    name: "Borrow / Debt Hub",
    symbol: "BORROW",
    type: "borrow",
    valueUSD: "$18.7M",
    rate: "5.82% APR",
    utilization: "67.2% UTIL",
    status: "TWO-KINK ACTIVE",
    position: [2.9, -1.3, 0.4],
  },
];

export const ProtocolNodes: React.FC<ProtocolNodesProps> = ({
  activeConcept,
  hoveredNodeId,
  onHoverNode,
  reducedMotion = false,
}) => {
  return (
    <group>
      {NODES_DATA.map((node) => (
        <SingleNode
          key={node.id}
          node={node}
          activeConcept={activeConcept}
          isHovered={hoveredNodeId === node.id}
          onHover={(hovered) => onHoverNode(hovered ? node.id : null)}
          reducedMotion={reducedMotion}
        />
      ))}
    </group>
  );
};

const SingleNode: React.FC<{
  node: NodeTelemetry;
  activeConcept: ProtocolConcept;
  isHovered: boolean;
  onHover: (hovered: boolean) => void;
  reducedMotion: boolean;
}> = ({ node, activeConcept, isHovered, onHover, reducedMotion }) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const [internalHover, setInternalHover] = useState(false);

  const isConceptActive =
    (node.type === "asset" && activeConcept === "liquidity") ||
    (node.type === "collateral" && (activeConcept === "collateral" || activeConcept === "risk")) ||
    (node.type === "borrow" && activeConcept === "borrow") ||
    isHovered ||
    internalHover;

  useFrame((state, delta) => {
    if (reducedMotion) return;

    const time = state.clock.getElapsedTime();

    if (groupRef.current) {
      // Subtle hovering bobbing
      const offset = Math.sin(time * 1.5 + node.position[0] * 2) * 0.04;
      groupRef.current.position.y = node.position[1] + offset;
    }

    if (coreMeshRef.current) {
      const targetScale = isConceptActive ? 1.25 : 1.0;
      coreMeshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        delta * 6.0
      );
    }
  });

  const nodeColor =
    node.type === "collateral"
      ? "#06b6d4" // Cyan
      : node.type === "borrow"
      ? "#0ea5e9" // Blue
      : isConceptActive
      ? "#10b981" // Emerald
      : "#38bdf8"; // Light Blue

  return (
    <group
      ref={groupRef}
      position={node.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setInternalHover(true);
        onHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setInternalHover(false);
        onHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Outer Geometric Frame Box */}
      <mesh>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshPhysicalMaterial
          color="#0f172a"
          emissive={isConceptActive ? nodeColor : "#1e293b"}
          emissiveIntensity={isConceptActive ? 0.8 : 0.2}
          roughness={0.2}
          metalness={0.9}
          transmission={0.4}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Wireframe Outline */}
      <mesh>
        <boxGeometry args={[0.705, 0.705, 0.705]} />
        <meshBasicMaterial
          color={isConceptActive ? nodeColor : "#334155"}
          wireframe
          transparent
          opacity={isConceptActive ? 0.95 : 0.4}
        />
      </mesh>

      {/* Inner Glowing Status Core */}
      <mesh ref={coreMeshRef}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color={nodeColor}
          emissive={nodeColor}
          emissiveIntensity={isConceptActive ? 1.6 : 0.8}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* HTML Telemetry Tag on Hover */}
      {isConceptActive && (
        <Html
          position={[0, 0.75, 0]}
          center
          distanceFactor={10}
          className="pointer-events-none transition-all duration-200"
        >
          <div className="bg-surface/95 backdrop-blur-md border border-border px-2.5 py-1.5 rounded-lg shadow-xl shadow-black/50 text-white font-mono text-[10px] whitespace-nowrap space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="font-bold">{node.symbol}</span>
              <span className="text-muted text-[9px]">({node.status})</span>
            </div>
            <div className="flex justify-between space-x-3 text-muted text-[9px]">
              <span>Rate: <b className="text-emerald-400">{node.rate}</b></span>
              <span>Pool: <b className="text-white">{node.valueUSD}</b></span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
