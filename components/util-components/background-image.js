"use client";

import React, { useEffect, useMemo, useState } from 'react'
import { useSettings } from '../../hooks/useSettings';
import { getWallpaperSrc } from '@/utils/wallpapers';

export default function BackgroundImage() {
    const { wallpaper } = useSettings();
    const [needsOverlay, setNeedsOverlay] = useState(false);
    const wallpaperSrc = useMemo(() => getWallpaperSrc(wallpaper), [wallpaper]);

    useEffect(() => {
        const img = new Image();
        setNeedsOverlay(false);
        img.src = wallpaperSrc;
        img.onload = () => {
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
                c /= 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            };
            const lum = 0.2126 * toLinear(avgR) + 0.7152 * toLinear(avgG) + 0.0722 * toLinear(avgB);
            const contrast = (1.05) / (lum + 0.05); // white text luminance is 1
            setNeedsOverlay(contrast < 4.5);
        };
        img.onerror = () => {
            setNeedsOverlay(false);
        };
    }, [wallpaperSrc]);

    return (
        <div
            className="bg-ubuntu-img absolute -z-10 top-0 right-0 overflow-hidden h-full w-full"
            style={{
                '--wallpaper-object-fit': 'cover',
                '--wallpaper-object-position': 'center',
                '--wallpaper-vignette-color': 'rgba(15, 23, 42, 0.6)',
                '--wallpaper-vignette-inner': '55%',
                '--wallpaper-vignette-outer': '125%',
                '--wallpaper-vignette-blend': 'soft-light',
                '--wallpaper-contrast-gradient': 'rgba(15, 23, 42, 0.65)',
            }}
        >
            <img
                src={wallpaperSrc}
                alt=""
                className="w-full h-full"
                style={{
                    objectFit: 'var(--wallpaper-object-fit, cover)',
                    objectPosition: 'var(--wallpaper-object-position, center)',
                }}
            />
            <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
                style={{
                    background: 'radial-gradient(circle at center, transparent var(--wallpaper-vignette-inner, 55%), var(--wallpaper-vignette-color, rgba(15, 23, 42, 0.6)) var(--wallpaper-vignette-outer, 125%))',
                    mixBlendMode: 'var(--wallpaper-vignette-blend, soft-light)',
                }}
            ></div>
            {needsOverlay && (
                <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden="true"
                    style={{
                        background: 'linear-gradient(to bottom, var(--wallpaper-contrast-gradient, rgba(0,0,0,0.6)), transparent)',
                    }}
                ></div>
            )}
        </div>
    )
}
