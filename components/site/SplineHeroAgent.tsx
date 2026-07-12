"use client";

import { HeroAgent } from "@/components/site/HeroAgent";

const SPLINE_SCENE_URL =
  "https://my.spline.design/happyrobotbutton-XfcewAUpdExke1yphAWpwvDY/";

export function SplineHeroAgent() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_50%_38%,#ffffff_0%,#e2f2ff_52%,#cfe9ff_76%,#f1f8ff_100%)]">
      <div aria-hidden="true" className="absolute inset-0">
        <HeroAgent />
      </div>

      <iframe
        allow="autoplay; fullscreen"
        className="absolute inset-0 h-full w-full border-0 bg-[#edf7ff]"
        loading="eager"
        src={SPLINE_SCENE_URL}
        title="Interactive ArcStream robot agent"
      />
    </div>
  );
}
