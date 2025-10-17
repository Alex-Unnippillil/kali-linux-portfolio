"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import KaliWallpaper from './kali-wallpaper';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

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
    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [imageMetrics, setImageMetrics] = useState({ naturalWidth: 0, naturalHeight: 0, url: null });
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const offsetRef = useRef(offset);
    const panStateRef = useRef({
        active: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        initialX: 0,
        initialY: 0,
    });
    const hasUserPannedRef = useRef(false);
    const fitMetricsRef = useRef({
        canPan: false,
        scaledWidth: 0,
        scaledHeight: 0,
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        centerX: 0,
        centerY: 0,
    });
    const [isPanning, setIsPanning] = useState(false);

    const accent = theme?.accent || '#1793d1';
    const wallpaperUrl = theme?.useKaliWallpaper ? null : theme?.wallpaperUrl || null;
    const fallbackUrl = theme?.fallbackWallpaperUrl || null;
    const effectiveUrl = (!imageError && wallpaperUrl) || fallbackUrl;
    const prefersReducedMotion = usePrefersReducedMotion();
    const shouldAnimate = !prefersReducedMotion;
    const wallpaperFit = typeof theme?.wallpaperFit === 'string' ? theme.wallpaperFit : 'cover';

    useEffect(() => {
        setImageError(false);
    }, [wallpaperUrl, fallbackUrl, theme?.useKaliWallpaper]);

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return undefined;

        const updateSize = () => {
            const rect = node.getBoundingClientRect();
            setContainerSize({ width: rect.width, height: rect.height });
        };

        updateSize();

        if (typeof ResizeObserver === 'undefined') {
            if (typeof window !== 'undefined') {
                window.addEventListener('resize', updateSize);
                return () => {
                    window.removeEventListener('resize', updateSize);
                };
            }
            return undefined;
        }

        const observer = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                const { width, height } = entry.contentRect;
                setContainerSize({ width, height });
            });
        });

        observer.observe(node);
        return () => {
            observer.disconnect();
        };
    }, []);

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

    useEffect(() => {
        hasUserPannedRef.current = false;
        setImageMetrics((prev) => {
            if (prev.url === effectiveUrl) {
                return prev;
            }
            return { naturalWidth: 0, naturalHeight: 0, url: null };
        });
    }, [effectiveUrl]);

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

    useEffect(() => {
        offsetRef.current = offset;
    }, [offset]);

    const fitMetrics = useMemo(() => {
        if (wallpaperFit !== 'fit') {
            return {
                canPan: false,
                scaledWidth: containerSize.width,
                scaledHeight: containerSize.height,
                minX: 0,
                maxX: 0,
                minY: 0,
                maxY: 0,
                centerX: 0,
                centerY: 0,
            };
        }

        const containerWidth = containerSize.width;
        const containerHeight = containerSize.height;
        const naturalWidth = imageMetrics.naturalWidth;
        const naturalHeight = imageMetrics.naturalHeight;

        if (!containerWidth || !containerHeight || !naturalWidth || !naturalHeight) {
            return {
                canPan: false,
                scaledWidth: containerWidth,
                scaledHeight: containerHeight,
                minX: 0,
                maxX: 0,
                minY: 0,
                maxY: 0,
                centerX: 0,
                centerY: 0,
            };
        }

        const scale = Math.max(containerWidth / naturalWidth, containerHeight / naturalHeight);
        const scaledWidth = naturalWidth * scale;
        const scaledHeight = naturalHeight * scale;
        const minX = Math.min(0, containerWidth - scaledWidth);
        const minY = Math.min(0, containerHeight - scaledHeight);
        const centerX = (containerWidth - scaledWidth) / 2;
        const centerY = (containerHeight - scaledHeight) / 2;
        const canPan = scaledWidth - containerWidth > 1 || scaledHeight - containerHeight > 1;

        return {
            canPan,
            scaledWidth,
            scaledHeight,
            minX,
            maxX: 0,
            minY,
            maxY: 0,
            centerX,
            centerY,
        };
    }, [wallpaperFit, containerSize.height, containerSize.width, imageMetrics.naturalHeight, imageMetrics.naturalWidth]);

    useEffect(() => {
        fitMetricsRef.current = fitMetrics;
    }, [fitMetrics]);

    const clamp = (value, min, max) => {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    };

    const canPan = wallpaperFit === 'fit' && fitMetrics.canPan;

    useEffect(() => {
        if (wallpaperFit !== 'fit') {
            hasUserPannedRef.current = false;
            if (offsetRef.current.x !== 0 || offsetRef.current.y !== 0) {
                setOffset({ x: 0, y: 0 });
            }
            return;
        }

        const metrics = fitMetricsRef.current;
        const targetX = clamp(metrics.centerX, metrics.minX, metrics.maxX);
        const targetY = clamp(metrics.centerY, metrics.minY, metrics.maxY);

        if (!hasUserPannedRef.current) {
            setOffset((current) => {
                if (Math.abs(current.x - targetX) > 0.1 || Math.abs(current.y - targetY) > 0.1) {
                    return { x: targetX, y: targetY };
                }
                return current;
            });
            return;
        }

        setOffset((current) => {
            const nextX = clamp(current.x, metrics.minX, metrics.maxX);
            const nextY = clamp(current.y, metrics.minY, metrics.maxY);
            if (Math.abs(nextX - current.x) > 0.1 || Math.abs(nextY - current.y) > 0.1) {
                return { x: nextX, y: nextY };
            }
            return current;
        });
    }, [
        wallpaperFit,
        imageMetrics.url,
        fitMetrics.centerX,
        fitMetrics.centerY,
        fitMetrics.maxX,
        fitMetrics.maxY,
        fitMetrics.minX,
        fitMetrics.minY,
    ]);

    useEffect(() => {
        if (!canPan && isPanning) {
            panStateRef.current = { ...panStateRef.current, active: false };
            setIsPanning(false);
        }
    }, [canPan, isPanning]);

    const handleImageLoad = (event) => {
        const img = event.currentTarget;
        setImageMetrics({
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            url: img.currentSrc || img.src,
        });
    };

    const handlePointerDown = (event) => {
        if (wallpaperFit !== 'fit') return;
        const metrics = fitMetricsRef.current;
        if (!metrics.canPan) return;
        const target = event.currentTarget;
        if (target.setPointerCapture) {
            try {
                target.setPointerCapture(event.pointerId);
            } catch (error) {
                // ignore capture errors
            }
        }
        panStateRef.current = {
            active: true,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            initialX: offsetRef.current.x,
            initialY: offsetRef.current.y,
        };
        setIsPanning(true);
        event.preventDefault();
    };

    const handlePointerMove = (event) => {
        const panState = panStateRef.current;
        if (!panState.active || panState.pointerId !== event.pointerId) {
            return;
        }
        const metrics = fitMetricsRef.current;
        event.preventDefault();
        const deltaX = event.clientX - panState.startX;
        const deltaY = event.clientY - panState.startY;
        const nextX = clamp(panState.initialX + deltaX, metrics.minX, metrics.maxX);
        const nextY = clamp(panState.initialY + deltaY, metrics.minY, metrics.maxY);
        const current = offsetRef.current;
        if (Math.abs(nextX - current.x) > 0.1 || Math.abs(nextY - current.y) > 0.1) {
            hasUserPannedRef.current = true;
            setOffset({ x: nextX, y: nextY });
        }
    };

    const handlePointerUp = (event) => {
        const panState = panStateRef.current;
        if (!panState.active || panState.pointerId !== event.pointerId) {
            return;
        }
        const target = event.currentTarget;
        if (target.releasePointerCapture) {
            try {
                target.releasePointerCapture(event.pointerId);
            } catch (error) {
                // ignore release errors
            }
        }
        panStateRef.current = {
            active: false,
            pointerId: null,
            startX: 0,
            startY: 0,
            initialX: 0,
            initialY: 0,
        };
        setIsPanning(false);
    };

    const containerStyle = useMemo(
        () => ({
            pointerEvents: canPan ? 'auto' : 'none',
            touchAction: canPan ? 'none' : undefined,
            cursor: canPan ? (isPanning ? 'grabbing' : 'grab') : undefined,
            userSelect: 'none',
        }),
        [canPan, isPanning],
    );

    const imageStyle = useMemo(() => {
        if (wallpaperFit === 'contain') {
            return {
                objectFit: 'contain',
                width: '100%',
                height: '100%',
                transform: 'none',
            };
        }
        if (wallpaperFit === 'fill') {
            return {
                objectFit: 'fill',
                width: '100%',
                height: '100%',
                transform: 'none',
            };
        }
        if (wallpaperFit === 'fit') {
            const width = fitMetrics.scaledWidth ? `${fitMetrics.scaledWidth}px` : '100%';
            const height = fitMetrics.scaledHeight ? `${fitMetrics.scaledHeight}px` : '100%';
            return {
                objectFit: 'cover',
                width,
                height,
                maxWidth: 'none',
                maxHeight: 'none',
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                transition:
                    isPanning || !shouldAnimate ? 'none' : 'transform 180ms ease-out',
                willChange: fitMetrics.canPan ? 'transform' : undefined,
            };
        }
        return {
            objectFit: 'cover',
            width: '100%',
            height: '100%',
            transform: 'scale(1.05)',
        };
    }, [
        wallpaperFit,
        fitMetrics.scaledHeight,
        fitMetrics.scaledWidth,
        fitMetrics.canPan,
        offset.x,
        offset.y,
        isPanning,
        shouldAnimate,
    ]);

    const pointerHandlers = canPan
        ? {
              onPointerDown: handlePointerDown,
              onPointerMove: handlePointerMove,
              onPointerUp: handlePointerUp,
              onPointerCancel: handlePointerUp,
          }
        : {};

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 -z-10 overflow-hidden"
            aria-hidden="true"
            style={containerStyle}
            {...pointerHandlers}
        >
            {theme?.useKaliWallpaper ? (
                <KaliWallpaper className="h-full w-full" />
            ) : effectiveUrl ? (
                <img
                    key={effectiveUrl}
                    src={effectiveUrl}
                    alt=""
                    className="absolute top-0 left-0 h-full w-full select-none"
                    style={imageStyle}
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                    draggable={false}
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
