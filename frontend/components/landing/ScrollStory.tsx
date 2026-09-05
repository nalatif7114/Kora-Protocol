"use client";

import React, { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useStoryProgress } from "../hooks/useStoryProgress";
import { STORY_CHAPTERS } from "./storyData";
import { StoryCard } from "./StoryCard";
import { SectionProgress } from "./SectionProgress";
import { ProtocolConcept } from "./types";

// Dynamic import of 3D Canvas to guarantee single persistent WebGL context without SSR hydration issues
const KoraHeroCanvas = dynamic(
  () =>
    import("../three/hero/KoraHeroCanvas").then((mod) => mod.KoraHeroCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[440px] rounded-2xl border border-border bg-card/40 animate-pulse flex items-center justify-center font-mono text-xs text-muted">
        INITIALIZING 3D INFRASTRUCTURE ENGINE...
      </div>
    ),
  }
);

interface ScrollStoryProps {
  onLaunchApp?: () => void;
  onExploreProtocol?: () => void;
}

export const ScrollStory: React.FC<ScrollStoryProps> = ({
  onLaunchApp,
  onExploreProtocol,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const {
    storyProgress,
    activeChapter,
    activeChapterIndex,
    isScrolling,
    scrollToChapter,
  } = useStoryProgress(containerRef);

  return (
    <section
      ref={containerRef}
      className="relative w-full h-[450vh] bg-background"
      aria-label="Kora Protocol Interactive Storytelling Architecture"
    >
      {/* Sticky Viewport Container */}
      <div className="sticky top-0 h-screen w-full flex items-center overflow-hidden">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center h-full max-h-[850px]">
            {/* Left Column: Progress Rail + Active Narrative Card (5 Columns on Desktop) */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-4 z-10">
              {/* Minimal Section Progress Rail */}
              <SectionProgress
                activeChapterIndex={activeChapterIndex}
                onSelectChapter={scrollToChapter}
                className="w-full"
              />

              {/* Active Story Chapter Card with Subtle Crossfade */}
              <div className="relative min-h-[380px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeChapter.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="w-full"
                  >
                    <StoryCard
                      chapter={activeChapter}
                      isActive={true}
                      onLaunchApp={onLaunchApp}
                      onExploreProtocol={onExploreProtocol}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Right Column: Persistent 3D Protocol Infrastructure (7 Columns on Desktop) */}
            <div className="lg:col-span-7 h-[380px] sm:h-[480px] lg:h-[620px] w-full">
              <KoraHeroCanvas
                activeConcept={activeChapter.concept}
                hoveredNodeId={hoveredNodeId}
                onHoverNode={setHoveredNodeId}
                onHoverConcept={() => {}}
                storyProgress={storyProgress}
                isScrolling={isScrolling}
                activeChapterTitle={activeChapter.headline}
                activeChapterNumber={activeChapter.chapterNumber}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
