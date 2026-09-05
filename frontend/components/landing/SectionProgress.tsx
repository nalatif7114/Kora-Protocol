"use client";

import React from "react";
import { STORY_CHAPTERS } from "./storyData";

interface SectionProgressProps {
  activeChapterIndex: number;
  onSelectChapter: (index: number) => void;
  className?: string;
}

export const SectionProgress: React.FC<SectionProgressProps> = ({
  activeChapterIndex,
  onSelectChapter,
  className = "",
}) => {
  const currentChapter = STORY_CHAPTERS[activeChapterIndex] || STORY_CHAPTERS[0];

  return (
    <nav
      aria-label="Story Chapter Progress"
      className={`flex items-center justify-between py-1 select-none ${className}`}
    >
      {/* Segmented Timeline Indicators */}
      <div className="flex items-center space-x-1.5">
        {STORY_CHAPTERS.map((chapter, index) => {
          const isActive = index === activeChapterIndex;
          const isPassed = index < activeChapterIndex;

          return (
            <button
              key={chapter.id}
              onClick={() => onSelectChapter(index)}
              title={`Jump to Chapter ${chapter.chapterNumber}: ${chapter.headline}`}
              className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isActive
                  ? "w-7 bg-accent"
                  : isPassed
                  ? "w-2.5 bg-slate-500/80 hover:bg-slate-300"
                  : "w-2.5 bg-slate-800 hover:bg-slate-600"
              }`}
              aria-label={`Chapter ${chapter.chapterNumber} ${chapter.concept}`}
              aria-current={isActive ? "step" : undefined}
            />
          );
        })}
      </div>

      {/* Chapter Counter & Subject */}
      <div className="flex items-center space-x-2 font-mono text-[11px] text-muted">
        <span className="text-slate-300 font-semibold tracking-wider">
          CHAPTER {currentChapter.chapterNumber} / 06
        </span>
      </div>
    </nav>
  );
};
