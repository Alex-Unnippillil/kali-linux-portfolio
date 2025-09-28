"use client";

import React from 'react';

export const KALI_WALLPAPER_CSS_VARIABLES = {
  baseGradient: '--kali-wallpaper-base-gradient',
  accentGlow: '--kali-wallpaper-accent-glow',
  shade: '--kali-wallpaper-shade',
  grid: '--kali-wallpaper-grid',
  gridSize: '--kali-wallpaper-grid-size',
  gridOpacity: '--kali-wallpaper-grid-opacity',
  gridBlend: '--kali-wallpaper-grid-blend',
  noise: '--kali-wallpaper-noise',
  noiseSize: '--kali-wallpaper-noise-size',
  noiseOpacity: '--kali-wallpaper-noise-opacity',
  noiseBlend: '--kali-wallpaper-noise-blend',
};

const BASE_GRADIENT_STYLE = {
  background: `var(${KALI_WALLPAPER_CSS_VARIABLES.baseGradient})`,
};

const SHADE_LAYER_STYLE = {
  background: `var(${KALI_WALLPAPER_CSS_VARIABLES.shade})`,
};

const ACCENT_GLOW_STYLE = {
  background: `var(${KALI_WALLPAPER_CSS_VARIABLES.accentGlow})`,
  mixBlendMode: 'screen',
};

const GRID_LAYER_STYLE = {
  backgroundImage: `var(${KALI_WALLPAPER_CSS_VARIABLES.grid})`,
  backgroundSize: `var(${KALI_WALLPAPER_CSS_VARIABLES.gridSize})`,
  opacity: `var(${KALI_WALLPAPER_CSS_VARIABLES.gridOpacity})`,
};

const NOISE_LAYER_STYLE = {
  backgroundImage: `var(${KALI_WALLPAPER_CSS_VARIABLES.noise})`,
  backgroundSize: `var(${KALI_WALLPAPER_CSS_VARIABLES.noiseSize})`,
  mixBlendMode: `var(${KALI_WALLPAPER_CSS_VARIABLES.noiseBlend})`,
  opacity: `var(${KALI_WALLPAPER_CSS_VARIABLES.noiseOpacity})`,
};

const DRAGON_PATH = "M256 62c-63 0-117 31-152 80 69-21 121 12 150 38 23 21 29 44 12 79-22 41-85 41-132 19 19 63 86 112 166 112 101 0 178-77 178-178 0-14-1-29-5-43 25 20 42 49 50 81 18 76-29 163-113 208l50 26-14 36-112-60c-101-12-187-84-212-174-28-102 26-216 132-246 34-10 70-14 102-4l-36 74c-4-1-9-2-14-2z";

function KaliDragon({ className = '' }) {
  return (
    <svg
      className={`pointer-events-none text-cyan-300/80 drop-shadow-[0_0_25px_rgba(23,147,209,0.55)] ${className}`}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Stylized Kali dragon"
      focusable="false"
    >
      <path fill="currentColor" d={DRAGON_PATH} />
    </svg>
  );
}

export function KaliWallpaper({ className = '', showDragon = true }) {
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0" style={BASE_GRADIENT_STYLE} />
      <div className="absolute inset-0" style={GRID_LAYER_STYLE} />
      <div className="absolute inset-0" style={ACCENT_GLOW_STYLE} />
      {showDragon && (
        <KaliDragon className="absolute left-1/2 top-1/2 h-[55%] max-h-[420px] w-auto -translate-x-1/2 -translate-y-1/2" />
      )}
      <div className="absolute inset-0" style={SHADE_LAYER_STYLE} />
      <div className="absolute inset-0" style={NOISE_LAYER_STYLE} />
    </div>
  );
}

export default KaliWallpaper;
