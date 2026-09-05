"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSmoothScroll } from "../providers/SmoothScrollProvider";
import { STORY_CHAPTERS } from "../landing/storyData";
import { StoryChapter } from "../landing/types";

export interface StoryProgressState {
  storyProgress: number; // 0 to 1 normalized across the entire story track
  activeChapter: StoryChapter;
  activeChapterIndex: number;
  isScrolling: boolean;
  scrollToChapter: (chapterIndex: number) => void;
}

export function useStoryProgress(
  containerRef: React.RefObject<HTMLElement>
): StoryProgressState {
  const { lenis, scrollTo, isReducedMotion } = useSmoothScroll();
  const [storyProgress, setStoryProgress] = useState<number>(0);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculateProgress = useCallback(() => {
    if (!containerRef.current || typeof window === "undefined") return;

    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const containerTop = rect.top + scrollTop;
    const containerHeight = rect.height;
    const viewportHeight = window.innerHeight;

    const totalScrollableDistance = containerHeight - viewportHeight;
    if (totalScrollableDistance <= 0) {
      setStoryProgress(0);
      setActiveChapterIndex(0);
      return;
    }

    const currentOffset = scrollTop - containerTop;
    const rawProgress = currentOffset / totalScrollableDistance;
    const progress = Math.min(Math.max(rawProgress, 0), 1);

    setStoryProgress(progress);

    // Determine active chapter based on progress ranges
    let matchedIndex = 0;
    for (let i = 0; i < STORY_CHAPTERS.length; i++) {
      const [start, end] = STORY_CHAPTERS[i].scrollRange;
      if (progress >= start && progress <= end) {
        matchedIndex = i;
        break;
      }
      if (progress > end && i === STORY_CHAPTERS.length - 1) {
        matchedIndex = i;
      }
    }
    setActiveChapterIndex(matchedIndex);

    // Mark scrolling state and debounce settling
    setIsScrolling(true);
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [containerRef]);

  useEffect(() => {
    // Initial calculation on mount
    calculateProgress();

    if (lenis) {
      lenis.on("scroll", calculateProgress);
    } else {
      window.addEventListener("scroll", calculateProgress, { passive: true });
    }

    window.addEventListener("resize", calculateProgress, { passive: true });

    return () => {
      if (lenis) {
        lenis.off("scroll", calculateProgress);
      } else {
        window.removeEventListener("scroll", calculateProgress);
      }
      window.removeEventListener("resize", calculateProgress);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [lenis, calculateProgress]);

  const scrollToChapter = useCallback(
    (chapterIndex: number) => {
      if (!containerRef.current || typeof window === "undefined") return;

      const rect = containerRef.current.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const containerTop = rect.top + scrollTop;
      const containerHeight = rect.height;
      const viewportHeight = window.innerHeight;
      const totalScrollableDistance = containerHeight - viewportHeight;

      const targetChapter = STORY_CHAPTERS[chapterIndex] || STORY_CHAPTERS[0];
      // Target the mid-point of the chapter's scroll range
      const midProgress =
        (targetChapter.scrollRange[0] + targetChapter.scrollRange[1]) / 2;
      const targetScrollY = containerTop + midProgress * totalScrollableDistance;

      scrollTo(targetScrollY, { duration: isReducedMotion ? 0 : 1.2 });
    },
    [containerRef, scrollTo, isReducedMotion]
  );

  return {
    storyProgress,
    activeChapter: STORY_CHAPTERS[activeChapterIndex] || STORY_CHAPTERS[0],
    activeChapterIndex,
    isScrolling,
    scrollToChapter,
  };
}
