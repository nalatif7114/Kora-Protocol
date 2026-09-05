"use client";

import React from "react";
import { ScrollStory } from "./ScrollStory";

interface KoraLandingPageProps {
  onLaunchApp?: () => void;
  onExploreProtocol?: () => void;
}

export const KoraLandingPage: React.FC<KoraLandingPageProps> = ({
  onLaunchApp,
  onExploreProtocol,
}) => {
  return (
    <div className="w-full">
      {/* Flagship FE-A3: Scroll-Driven 3D Storytelling Experience */}
      <ScrollStory
        onLaunchApp={onLaunchApp}
        onExploreProtocol={onExploreProtocol}
      />
    </div>
  );
};
