"use client";

import React, { useEffect, useMemo, useState } from 'react';
import KaliWallpaper from './kali-wallpaper';

const FALLBACK_OVERLAY = 'linear-gradient(180deg, rgba(6, 12, 20, 0.65) 0%, rgba(3, 8, 16, 0.88) 92%)';

const hexToRgba = (hex, alpha = 1) => {
    if (typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) return `rgba(0,0,0,${alpha})`;
    const value = parseInt(normalized, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function BackgroundImage({ theme }) {
    const [needsOverlay, setNeedsOverlay] = useState(false);
    const [imageError, setImageError] = useState(false);

    const accent = theme?.accent || '#1793d1';
    const wallpaperUrl = theme?.useKaliWallpaper ? null : theme?.wallpaperUrl || null;
    const fallbackUrl = theme?.fallbackWallpaperUrl || null;
    const effectiveUrl = (!imageError && wallpaperUrl) || fallbackUrl;
    const blurAmount = typeof theme?.blur === 'number' ? theme.blur : 0;

    useEffect(() => {
        setImageError(false);
    }, [wallpaperUrl, fallbackUrl, theme?.useKaliWallpaper]);

    useEffect(() => {
        if (theme?.useKaliWallpaper || theme?.overlay) {
            setNeedsOverlay(false);
            return;
        }
        if (!effectiveUrl) {
            setNeedsOverlay(false);
            return;
        }
        let cancelled = false;
        const img = new Image();
        img.src = effectiveUrl;
        img.onload = () => {
            if (cancelled) return;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                setNeedsOverlay(false);
                return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0;
            let g = 0;
            let b = 0;
            let count = 0;
            for (let i = 0; i < data.length; i += 40) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }
            if (!count) {
                setNeedsOverlay(false);
                return;
            }
            const avgR = r / count;
            const avgG = g / count;
            const avgB = b / count;
            const toLinear = (channel) => {
                const value = channel / 255;
                return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
            };
            const luminance = 0.2126 * toLinear(avgR) + 0.7152 * toLinear(avgG) + 0.0722 * toLinear(avgB);
            const contrast = 1.05 / (luminance + 0.05);
            setNeedsOverlay(contrast < 4.5);
        };
        img.onerror = () => {
            if (!cancelled) {
                setNeedsOverlay(false);
            }
        };
        return () => {
            cancelled = true;
        };
    }, [effectiveUrl, theme?.useKaliWallpaper, theme?.overlay]);

    const accentGlow = useMemo(() => {
        const inner = hexToRgba(accent, 0.24);
        const outer = hexToRgba(accent, 0.05);
        return `radial-gradient(circle at 22% 18%, ${inner} 0%, ${outer} 45%, rgba(0,0,0,0) 70%)`;
    }, [accent]);

    const overlayBackground = theme?.overlay || (needsOverlay ? FALLBACK_OVERLAY : null);

    const handleImageError = () => {
        if (!imageError && wallpaperUrl && fallbackUrl && wallpaperUrl !== fallbackUrl) {
            setImageError(true);
        } else {
            setNeedsOverlay(false);
        }
    };

    return (
        <div
            className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
            aria-hidden="true"
        >
            {theme?.useKaliWallpaper ? (
                <KaliWallpaper className="h-full w-full" />
            ) : effectiveUrl ? (
                <img
                    key={effectiveUrl}
                    src={effectiveUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{
                        filter: blurAmount ? `blur(${Math.max(blurAmount - 6, 0)}px)` : undefined,
                        transform: 'scale(1.05)',
                    }}
                    onError={handleImageError}
                />
            ) : null}
            {overlayBackground && (
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{ background: overlayBackground }}
                />
            )}
            <div
                className="pointer-events-none absolute inset-0 mix-blend-screen opacity-70"
                style={{ background: accentGlow }}
            />
            {blurAmount > 0 && (
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        backdropFilter: `blur(${blurAmount}px)`,
                        WebkitBackdropFilter: `blur(${blurAmount}px)`,
                    }}
                />
            )}
        </div>
    );
}
