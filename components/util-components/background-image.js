"use client";

import React from 'react';
import { useWallpaper } from '../../hooks/useWallpaper';
import AccentPrompt from '../apps/theme/AccentPrompt';

export default function BackgroundImage() {
    const {
        wallpaper,
        accent,
        accentCandidate,
        needsOverlay,
        palette,
        status,
        promptOpen,
        acceptAccent,
        dismissAccent,
        error,
    } = useWallpaper();

    const source = wallpaper ? `/wallpapers/${wallpaper}.webp` : '';

    return (
        <div className="bg-ubuntu-img absolute -z-10 top-0 right-0 overflow-hidden h-full w-full">
            {source && (
                <img
                    src={source}
                    alt=""
                    className="w-full h-full object-cover"
                />
            )}
            {needsOverlay && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 to-transparent" aria-hidden="true"></div>
            )}
            {accentCandidate && (
                <AccentPrompt
                    open={promptOpen}
                    wallpaper={wallpaper}
                    accent={accentCandidate}
                    currentAccent={accent}
                    palette={palette}
                    status={status}
                    onAccept={acceptAccent}
                    onDismiss={dismissAccent}
                    error={error}
                />
            )}
        </div>
    );
}
