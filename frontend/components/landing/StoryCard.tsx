"use client";

import React from "react";
import { motion } from "framer-motion";
import { StoryChapter } from "./types";
import { ArrowRight, ShieldCheck, Database, Cpu } from "lucide-react";

interface StoryCardProps {
  chapter: StoryChapter;
  isActive: boolean;
  onLaunchApp?: () => void;
  onExploreProtocol?: () => void;
  isReducedMotion?: boolean;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  chapter,
  isActive,
  onLaunchApp,
  onExploreProtocol,
}) => {
  const isOverview = chapter.concept === "overview";
  const isSecurity = chapter.concept === "security";

  return (
    <article
      className={`w-full transition-opacity duration-300 ${
        isActive ? "opacity-100" : "opacity-40"
      }`}
    >
      <div className="p-6 sm:p-8 rounded-2xl border border-border/70 bg-card/75 backdrop-blur-xl shadow-2xl shadow-black/50 space-y-5">
        {/* Eyebrow */}
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-slate-300 font-semibold">
            {chapter.eyebrow}
          </span>
        </div>

        {/* Headline & Narrative Lead */}
        <div className="space-y-2">
          <h2
            className={`font-bold tracking-tight text-white ${
              isOverview
                ? "text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight"
                : "text-2xl sm:text-3xl leading-snug"
            }`}
          >
            {chapter.headline}
          </h2>
          {chapter.subheadline && (
            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              {chapter.subheadline}
            </p>
          )}
        </div>

        {/* Descriptive Body (Clean prose without redundancy) */}
        {chapter.description && !isOverview && (
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-prose">
            {chapter.description}
          </p>
        )}

        {/* Technical Telemetry Strip: Clean typography instead of nested boxes */}
        <div className="border-t border-border/60 pt-4 mt-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
            <div>
              <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-0.5">
                {chapter.primaryMetric.label}
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
                {chapter.primaryMetric.value}
              </div>
            </div>
            {chapter.primaryMetric.detail && (
              <span className="text-[11px] font-mono text-emerald-400 font-semibold px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                {chapter.primaryMetric.detail}
              </span>
            )}
          </div>

          {/* Secondary Metric Pair (Clean borderless stat columns) */}
          {chapter.secondaryMetrics && chapter.secondaryMetrics.length > 0 && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40 font-mono text-xs">
              {chapter.secondaryMetrics.map((sec, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="text-[10px] text-muted uppercase tracking-wider">
                    {sec.label}
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-200">
                    {sec.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action CTAs for Overview & Final Security Chapters */}
        {isOverview && (
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onLaunchApp}
              className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accentHover text-white font-sans font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-accent/20 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onExploreProtocol}
              className="px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-cardHover text-slate-300 font-sans font-semibold text-xs transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Explore Markets
            </button>
          </div>
        )}

        {isSecurity && (
          <div className="pt-2">
            <button
              onClick={onLaunchApp}
              className="w-full py-3 rounded-xl bg-accent hover:bg-accentHover text-white font-sans font-bold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-accent/25 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span>Launch Institutional Terminal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
