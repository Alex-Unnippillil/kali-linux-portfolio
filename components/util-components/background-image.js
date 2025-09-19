"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';
import { getDominantColor, relativeLuminance } from '../../utils/color';

const contrastThreshold = 4.5;

export default function BackgroundImage() {
    const { wallpaper, wallpaperBlur, wallpaperBrightness, setWallpaperAccent } = useSettings();
    const [needsOverlay, setNeedsOverlay] = useState(false);
    const filterValue = useMemo(
        () => `blur(${wallpaperBlur}px) brightness(${wallpaperBrightness})`,
        [wallpaperBlur, wallpaperBrightness]
    );

    useEffect(() => {
        let cancelled = false;
        const image = new Image();
        image.decoding = 'async';
        const src = `/wallpapers/${wallpaper}.webp`;

        setNeedsOverlay(false);

        const waitForLoad = () =>
            new Promise((resolve, reject) => {
                if (image.complete && image.naturalWidth) {
                    resolve();
                    return;
                }
                function cleanup() {
                    image.removeEventListener('load', handleLoad);
                    image.removeEventListener('error', handleError);
                }
                function handleLoad() {
                    cleanup();
                    resolve();
                }
                function handleError() {
                    cleanup();
                    reject(new Error('Failed to load wallpaper'));
                }
                image.addEventListener('load', handleLoad, { once: true });
                image.addEventListener('error', handleError, { once: true });
            });

        const analyze = async () => {
            try {
                image.src = src;
                if ('decode' in image) {
                    try {
                        await image.decode();
                    } catch (error) {
                        await waitForLoad();
                    }
                } else {
                    await waitForLoad();
                }

                if (cancelled) return;

                const accent = await getDominantColor(image);
                if (cancelled) return;

                setWallpaperAccent(accent);
                const luminance = relativeLuminance(accent);
                const contrast = 1.05 / (luminance + 0.05);
                setNeedsOverlay(contrast < contrastThreshold);
            } catch (error) {
                if (!cancelled) {
                    setNeedsOverlay(false);
                }
            }
        };

        analyze();

        return () => {
            cancelled = true;
        };
    }, [wallpaper, setWallpaperAccent]);

    return (
        <div className="bg-ubuntu-img absolute -z-10 top-0 right-0 overflow-hidden h-full w-full">
            <img
                src={`/wallpapers/${wallpaper}.webp`}
                alt=""
                className="h-full w-full object-cover"
                style={{ filter: filterValue }}
            />
            {needsOverlay && (
                <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 to-transparent"
                    aria-hidden="true"
                ></div>
            )}
        </div>
    );
}
