"use client";

import React from 'react';

const BASE_LAYER = {
  background: 'radial-gradient(circle at 20% 20%, rgba(62, 126, 214, 0.9) 0%, rgba(14, 37, 79, 0.92) 45%, rgba(4, 11, 24, 0.98) 100%)',
};

const LIGHT_CURVE = {
  background:
    'radial-gradient(circle at 80% 10%, rgba(96, 165, 250, 0.6) 0%, rgba(14, 37, 79, 0) 55%)',
  mixBlendMode: 'screen',
};

const DARK_CURVE = {
  background:
    'radial-gradient(circle at 0% 80%, rgba(30, 64, 175, 0.65) 0%, rgba(15, 23, 42, 0.05) 55%, rgba(2, 6, 17, 0.1) 100%)',
};

const PANEL_OVERLAY = {
  background: 'linear-gradient(145deg, rgba(12, 26, 48, 0.25) 0%, rgba(12, 26, 48, 0.75) 45%, rgba(8, 19, 38, 0.85) 100%)',
};

const GLOW_GRID = {
  backgroundImage:
    'radial-gradient(circle at center, rgba(148, 197, 255, 0.18) 0%, rgba(148, 197, 255, 0) 60%)',
  mixBlendMode: 'screen',
};

export default function UndercoverWallpaper({ className = '' }) {
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0" style={BASE_LAYER} />
      <div
        className="absolute -left-1/4 top-[-5%] h-[140%] w-[70%] rotate-6 opacity-70 blur-3xl"
        style={LIGHT_CURVE}
      />
      <div
        className="absolute -right-1/3 bottom-[-15%] h-[150%] w-[85%] -rotate-3 opacity-60 blur-[140px]"
        style={DARK_CURVE}
      />
      <div className="absolute inset-0 opacity-80" style={GLOW_GRID} />
      <div className="absolute inset-0" style={PANEL_OVERLAY} />
    </div>
  );
}
