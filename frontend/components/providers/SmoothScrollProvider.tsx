"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import Lenis from "lenis";

interface SmoothScrollContextType {
  lenis: Lenis | null;
  scrollProgress: number;
  isReducedMotion: boolean;
}

const SmoothScrollContext = createContext<SmoothScrollContextType>({
  lenis: null,
  scrollProgress: 0,
  isReducedMotion: false,
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

export const SmoothScrollProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lenisInstance, setLenisInstance] = useState<Lenis | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const reqIdRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Check for reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };
    mediaQuery.addEventListener("change", handleMotionChange);

    // If reduced motion is requested, do not initialize smooth scroll interpolation
    if (mediaQuery.matches) {
      return () => {
        mediaQuery.removeEventListener("change", handleMotionChange);
      };
    }

    // 2. Initialize exactly ONE global Lenis instance
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.5,
    });

    setLenisInstance(lenis);

    lenis.on("scroll", (e: { progress: number }) => {
      setScrollProgress(e.progress);
    });

    const raf = (time: number) => {
      lenis.raf(time);
      reqIdRef.current = requestAnimationFrame(raf);
    };

    reqIdRef.current = requestAnimationFrame(raf);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionChange);
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      lenis.destroy();
    };
  }, []);

  return (
    <SmoothScrollContext.Provider
      value={{
        lenis: lenisInstance,
        scrollProgress,
        isReducedMotion,
      }}
    >
      {children}
    </SmoothScrollContext.Provider>
  );
};
