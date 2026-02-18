"use client";

import React, { useEffect, useMemo, useState } from 'react';
import KaliWallpaper from './kali-wallpaper';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

const FALLBACK_OVERLAY = 'linear-gradient(180deg, rgba(6, 12, 20, 0.65) 0%, rgba(3, 8, 16, 0.88) 92%)';
const LUMINANCE_SAMPLE_SIZE = 64;

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
    const prefersReducedMotion = usePrefersReducedMotion();
    const shouldAnimate = !prefersReducedMotion;

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
        let idleId = null;
        const img = new Image();
        img.decoding = 'async';
        img.src = effectiveUrl;
        img.onload = () => {
            const run = () => {
                if (cancelled) return;
                const canvas = document.createElement('canvas');
                canvas.width = LUMINANCE_SAMPLE_SIZE;
                canvas.height = LUMINANCE_SAMPLE_SIZE;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) {
                    setNeedsOverlay(false);
                    return;
                }
                ctx.drawImage(img, 0, 0, LUMINANCE_SAMPLE_SIZE, LUMINANCE_SAMPLE_SIZE);
                const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                let r = 0;
                let g = 0;
                let b = 0;
                let count = 0;
                for (let i = 0; i < data.length; i += 20) {
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

            if (typeof window.requestIdleCallback === 'function') {
                idleId = window.requestIdleCallback(run, { timeout: 250 });
                return;
            }

            idleId = window.setTimeout(run, 0);
        };
        img.onerror = () => {
            if (!cancelled) {
                setNeedsOverlay(false);
            }
        };
        return () => {
            cancelled = true;
            if (idleId !== null) {
                if (typeof window.cancelIdleCallback === 'function') {
                    window.cancelIdleCallback(idleId);
                } else {
                    window.clearTimeout(idleId);
                }
            }
        };
    }, [effectiveUrl, theme?.useKaliWallpaper, theme?.overlay]);

    const accentGlow = useMemo(() => {
        const strong = hexToRgba(accent, 0.38);
        const medium = hexToRgba(accent, 0.16);
        const soft = hexToRgba(accent, 0.08);
        return [
            `radial-gradient(circle at 18% 24%, ${strong} 0%, ${medium} 32%, rgba(0,0,0,0) 68%)`,
            'radial-gradient(circle at 82% 22%, rgba(56, 189, 248, 0.32) 0%, rgba(6, 20, 33, 0.08) 44%, rgba(0,0,0,0) 76%)',
            `radial-gradient(circle at 78% 76%, ${medium} 0%, ${soft} 42%, rgba(0,0,0,0) 74%)`,
        ].join(', ');
    }, [accent]);

    const accentBloom = useMemo(() => {
        const highlight = hexToRgba(accent, 0.28);
        const shimmer = hexToRgba(accent, 0.12);
        return [
            `radial-gradient(120% 120% at 12% 20%, ${highlight} 0%, rgba(6, 18, 30, 0.5) 48%, rgba(0,0,0,0) 74%)`,
            `radial-gradient(120% 120% at 88% 18%, rgba(94, 234, 212, 0.28) 0%, rgba(8, 47, 73, 0.16) 44%, rgba(0,0,0,0) 78%)`,
            `radial-gradient(120% 160% at 60% 100%, ${shimmer} 0%, rgba(4, 16, 28, 0.42) 36%, rgba(0,0,0,0) 76%)`,
        ].join(', ');
    }, [accent]);

    const gridTexture = useMemo(
        () =>
            'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 148, 210, 0.08) 1px, transparent 1px)',
        [],
    );

    const grainTexture = useMemo(
        () =>
            'repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.04) 0, rgba(255, 255, 255, 0.04) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(90deg, rgba(15, 148, 210, 0.03) 0, rgba(15, 148, 210, 0.03) 1px, transparent 1px, transparent 5px)',
        [],
    );

    const horizonOverlay = useMemo(
        () => 'linear-gradient(180deg, rgba(2, 10, 19, 0) 0%, rgba(4, 14, 26, 0.32) 52%, rgba(2, 8, 18, 0.82) 100%)',
        [],
    );

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
                    decoding="async"
                    fetchPriority="high"
                    style={{
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
            <div className="pointer-events-none absolute inset-0 mix-blend-screen">
                <div className="absolute inset-0 opacity-75" style={{ background: accentGlow }} />
                <div
                    className="absolute"
                    style={{
                        top: '-32%',
                        left: '-32%',
                        right: '-32%',
                        bottom: '-32%',
                        background: accentBloom,
                        opacity: 0.55,
                        filter: 'blur(60px)',
                        transform: 'rotate(0deg) scale(1)',
                        animation: shouldAnimate ? 'ambientGlowDrift 42s ease-in-out infinite alternate' : undefined,
                    }}
                />
            </div>
            <div
                className="pointer-events-none absolute inset-0 mix-blend-soft-light"
                style={{
                    backgroundImage: gridTexture,
                    backgroundSize: '120px 120px, 120px 120px',
                    backgroundPosition: '0px 0px, 0px 0px',
                    opacity: 0.28,
                    animation: shouldAnimate ? 'ambientGridPan 48s linear infinite' : undefined,
                }}
            />
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background: horizonOverlay,
                }}
            />
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    backgroundImage: grainTexture,
                    backgroundSize: '6px 6px, 5px 5px',
                    opacity: 0.14,
                    animation: shouldAnimate ? 'ambientNoisePulse 6s ease-in-out infinite alternate' : undefined,
                }}
            />
        </div>
    );
}
