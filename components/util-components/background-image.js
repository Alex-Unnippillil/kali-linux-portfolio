"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import KaliWallpaper from './kali-wallpaper';

const KALI_WALLPAPER_KEYS = new Set(['kali-gradient', 'kali-theme', 'kali']);

export default function BackgroundImage({ bg_image_name: legacyBgImageName, showDragon }) {
    const { bgImageName, wallpaper, useKaliWallpaper } = useSettings();
    const [needsOverlay, setNeedsOverlay] = useState(false);

    const normalizedLegacy = useMemo(() => {
        if (typeof legacyBgImageName !== 'string') return undefined;
        return legacyBgImageName.trim();
    }, [legacyBgImageName]);

    const resolvedWallpaperName = useMemo(() => {
        if (useKaliWallpaper) {
            return 'kali-gradient';
        }

        if (bgImageName && KALI_WALLPAPER_KEYS.has(bgImageName)) {
            return 'kali-gradient';
        }

        if (normalizedLegacy && KALI_WALLPAPER_KEYS.has(normalizedLegacy)) {
            return 'kali-gradient';
        }

        if (wallpaper) {
            return wallpaper;
        }

        if (bgImageName) {
            return bgImageName;
        }

        if (normalizedLegacy) {
            return normalizedLegacy;
        }

        return 'wall-2';
    }, [bgImageName, normalizedLegacy, useKaliWallpaper, wallpaper]);

    const kaliActive = useKaliWallpaper || KALI_WALLPAPER_KEYS.has(resolvedWallpaperName);
    const shouldShowDragon = typeof showDragon === 'boolean' ? showDragon : true;

    useEffect(() => {
        if (kaliActive) {
            setNeedsOverlay(false);
            return;
        }

        if (!resolvedWallpaperName) {
            setNeedsOverlay(false);
            return;
        }

        let cancelled = false;
        const img = new Image();
        img.src = `/wallpapers/${resolvedWallpaperName}.webp`;
        img.onload = () => {
            if (cancelled) return;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 40) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
            const avgR = r / count, avgG = g / count, avgB = b / count;
            const toLinear = (c) => {
                const normalized = c / 255;
                return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
            };
            const lum = 0.2126 * toLinear(avgR) + 0.7152 * toLinear(avgG) + 0.0722 * toLinear(avgB);
            const contrast = 1.05 / (lum + 0.05); // white text luminance is 1
            setNeedsOverlay(contrast < 4.5);
        };

        return () => {
            cancelled = true;
        };
    }, [kaliActive, resolvedWallpaperName]);

    return (
        <div className="bg-ubuntu-img absolute -z-10 top-0 right-0 overflow-hidden h-full w-full">
            {kaliActive ? (
                <KaliWallpaper showDragon={shouldShowDragon} />
            ) : (
                <>
                    <img
                        src={`/wallpapers/${resolvedWallpaperName}.webp`}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                    {needsOverlay && (
                        <div
                            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 to-transparent"
                            aria-hidden="true"
                        ></div>
                    )}
                </>
            )}
        </div>
    );
}
