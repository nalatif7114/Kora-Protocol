"use client";

import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface HeroCameraProps {
  reducedMotion?: boolean;
}

export const HeroCamera: React.FC<HeroCameraProps> = ({ reducedMotion = false }) => {
  const { camera, size, pointer } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 0, 8.5));
  const currentPos = useRef(new THREE.Vector3(0, 0, 8.5));
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    // 1. Calculate responsive base distance based on viewport width
    const aspect = size.width / size.height;
    let baseZ = 8.5;
    let baseY = 0.2;
    let baseX = 0.5; // Offset slightly right to leave room for hero copy on desktop

    if (size.width < 768) {
      // Mobile: Centered, pulled back to fit in vertical layout
      baseZ = 10.5;
      baseX = 0;
      baseY = 0;
    } else if (size.width < 1024) {
      // Tablet: Medium offset
      baseZ = 9.2;
      baseX = 0.2;
      baseY = 0.1;
    }

    if (reducedMotion) {
      // Frozen static camera position, zero parallax
      camera.position.set(baseX, baseY, baseZ);
      camera.lookAt(0, 0, 0);
      return;
    }

    // 2. Subtle pointer parallax (restrained to +/- 0.3 units)
    const parallaxX = pointer.x * 0.45;
    const parallaxY = pointer.y * 0.3;

    targetPos.current.set(baseX + parallaxX, baseY + parallaxY, baseZ);

    // 3. Smooth dampening (lerp with delta clamping)
    const lerpFactor = Math.min(1, delta * 3.5);
    currentPos.current.lerp(targetPos.current, lerpFactor);
    camera.position.copy(currentPos.current);

    // 4. Subtle lookAt interpolation
    lookTarget.current.set(pointer.x * 0.1, pointer.y * 0.08, 0);
    camera.lookAt(lookTarget.current);
  });

  return null;
};
