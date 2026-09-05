"use client";

import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { STORY_CHAPTERS } from "../../landing/storyData";

interface HeroCameraProps {
  storyProgress?: number; // 0 to 1
  isScrolling?: boolean;
  reducedMotion?: boolean;
}

export const HeroCamera: React.FC<HeroCameraProps> = ({
  storyProgress = 0,
  isScrolling = false,
  reducedMotion = false,
}) => {
  const { camera, size, pointer } = useThree();
  const currentPos = useRef(new THREE.Vector3(0.5, 0.2, 8.5));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const targetPos = useRef(new THREE.Vector3(0.5, 0.2, 8.5));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    const isMobile = size.width < 768;
    const isTablet = size.width >= 768 && size.width < 1024;

    if (reducedMotion) {
      // Clean, static, high-contrast perspective without motion
      camera.position.set(0, 0, isMobile ? 10.5 : 8.5);
      camera.lookAt(0, 0, 0);
      return;
    }

    // 1. Calculate waypoint interpolation along the story progress timeline
    // Find surrounding chapter waypoints based on storyProgress
    const clampedProgress = Math.min(Math.max(storyProgress, 0), 1);

    // Compute interpolated camera target and lookAt across the 7 chapters
    let basePos = new THREE.Vector3(0.5, 0.2, 8.5);
    let baseLook = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < STORY_CHAPTERS.length; i++) {
      const chapter = STORY_CHAPTERS[i];
      const [start, end] = chapter.scrollRange;

      if (clampedProgress >= start && clampedProgress <= end) {
        // We are within chapter i
        const nextChapter = STORY_CHAPTERS[i + 1] || chapter;
        const segmentProgress = (clampedProgress - start) / (end - start);

        // Dwell plateau: camera rests rock-solid at chapter hero viewpoint for 70% of chapter
        // Smoothly glides to next chapter waypoint only during the final 30% exit window
        let transitionT = 0;
        const dwellThreshold = 0.70;
        if (segmentProgress > dwellThreshold && i < STORY_CHAPTERS.length - 1) {
          const rawT = (segmentProgress - dwellThreshold) / (1 - dwellThreshold);
          // Hermite smoothstep easing
          transitionT = rawT * rawT * (3 - 2 * rawT);
        }

        const p1 = new THREE.Vector3(...chapter.cameraTarget);
        const p2 = new THREE.Vector3(...nextChapter.cameraTarget);
        basePos.lerpVectors(p1, p2, transitionT);

        const l1 = new THREE.Vector3(...chapter.cameraLookAt);
        const l2 = new THREE.Vector3(...nextChapter.cameraLookAt);
        baseLook.lerpVectors(l1, l2, transitionT);
        break;
      } else if (clampedProgress > end && i === STORY_CHAPTERS.length - 1) {
        basePos.set(...chapter.cameraTarget);
        baseLook.set(...chapter.cameraLookAt);
      }
    }

    // 2. Responsive scaling
    if (isMobile) {
      // Center horizontally on mobile and scale back Z distance
      basePos.x = basePos.x * 0.35;
      basePos.y = basePos.y * 0.5;
      basePos.z = basePos.z + 2.0;
      baseLook.x = baseLook.x * 0.3;
    } else if (isTablet) {
      basePos.x = basePos.x * 0.65;
      basePos.z = basePos.z + 0.8;
    }

    // 3. Subtle Pointer Parallax
    // Suppress parallax to a whisper while user is actively scrolling to prevent motion conflict
    const parallaxIntensity = isScrolling ? 0.02 : isMobile ? 0.05 : 0.18;
    const px = pointer.x * parallaxIntensity;
    const py = pointer.y * parallaxIntensity * 0.6;

    targetPos.current.set(basePos.x + px, basePos.y + py, basePos.z);
    targetLookAt.current.set(baseLook.x + px * 0.15, baseLook.y + py * 0.15, baseLook.z);

    // 4. Smooth Damped Interpolation
    const dampAlpha = Math.min(1.0, delta * 3.0);
    currentPos.current.lerp(targetPos.current, dampAlpha);
    currentLookAt.current.lerp(targetLookAt.current, dampAlpha);

    camera.position.copy(currentPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
};
