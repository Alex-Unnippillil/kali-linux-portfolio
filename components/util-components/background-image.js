"use client";

import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import KaliWallpaper from './kali-wallpaper';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { useSettings } from '../../hooks/useSettings';

const FALLBACK_OVERLAY = 'linear-gradient(180deg, rgba(6, 12, 20, 0.65) 0%, rgba(3, 8, 16, 0.88) 92%)';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const ZERO_OFFSET = { x: 0, y: 0 };

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

const hasDimension = (value) => Number.isFinite(value) && value > 0;

const sanitizeOffset = (offset) => {
    if (!offset || typeof offset !== 'object') return ZERO_OFFSET;
    const x = Number(offset.x);
    const y = Number(offset.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return ZERO_OFFSET;
    return {
        x: clamp(x, -0.5, 0.5),
        y: clamp(y, -0.5, 0.5),
    };
};

const BackgroundImage = forwardRef(function BackgroundImage({ theme }, ref) {
    const containerRef = useRef(null);
    const dragStateRef = useRef(null);
    const offsetRef = useRef(ZERO_OFFSET);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [needsOverlay, setNeedsOverlay] = useState(false);
    const [imageError, setImageError] = useState(false);

    const { wallpaper, wallpaperMode, wallpaperOffsets, updateWallpaperOffset } = useSettings();

    const accent = theme?.accent || '#1793d1';
    const wallpaperUrl = theme?.useKaliWallpaper ? null : theme?.wallpaperUrl || null;
    const fallbackUrl = theme?.fallbackWallpaperUrl || null;
    const effectiveUrl = (!imageError && wallpaperUrl) || fallbackUrl;
    const prefersReducedMotion = usePrefersReducedMotion();
    const shouldAnimate = !prefersReducedMotion;

    const wallpaperKey = useMemo(() => {
        if (typeof wallpaper === 'string' && wallpaper.length) return wallpaper;
        if (typeof theme?.wallpaperName === 'string' && theme.wallpaperName.length) {
            return theme.wallpaperName;
        }
        if (typeof effectiveUrl === 'string' && effectiveUrl.length) return effectiveUrl;
        return 'default-wallpaper';
    }, [effectiveUrl, theme?.wallpaperName, wallpaper]);

    const storedOffset = useMemo(() => {
        if (wallpaperMode !== 'fit') return ZERO_OFFSET;
        const entry = wallpaperOffsets?.[wallpaperKey];
        return sanitizeOffset(entry);
    }, [wallpaperKey, wallpaperMode, wallpaperOffsets]);

    const [activeOffset, setActiveOffset] = useState(storedOffset);

    useEffect(() => {
        offsetRef.current = activeOffset;
    }, [activeOffset]);

    useEffect(() => {
        setImageError(false);
    }, [wallpaperUrl, fallbackUrl, theme?.useKaliWallpaper]);

    useEffect(() => {
        setActiveOffset((prev) => {
            if (
                Math.abs(prev.x - storedOffset.x) < 1e-4 &&
                Math.abs(prev.y - storedOffset.y) < 1e-4
            ) {
                return prev;
            }
            offsetRef.current = storedOffset;
            return storedOffset;
        });
    }, [storedOffset, wallpaperKey]);

    useEffect(() => {
        if (!containerRef.current || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            setContainerSize((prev) => {
                if (Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5) {
                    return prev;
                }
                return { width, height };
            });
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!effectiveUrl) {
            setNaturalSize({ width: 0, height: 0 });
        }
    }, [effectiveUrl]);

    const slack = useMemo(() => {
        if (wallpaperMode !== 'fit') {
            return { x: 0, y: 0 };
        }
        const containerWidth = containerSize.width;
        const containerHeight = containerSize.height;
        const imageWidth = naturalSize.width;
        const imageHeight = naturalSize.height;
        if (!hasDimension(containerWidth) || !hasDimension(containerHeight)) {
            return { x: 0, y: 0 };
        }
        if (!hasDimension(imageWidth) || !hasDimension(imageHeight)) {
            return { x: 0, y: 0 };
        }
        const widthRatio = containerWidth / imageWidth;
        const heightRatio = containerHeight / imageHeight;
        const scale = Math.min(widthRatio, heightRatio);
        const displayedWidth = imageWidth * scale;
        const displayedHeight = imageHeight * scale;
        return {
            x: Math.max(0, containerWidth - displayedWidth),
            y: Math.max(0, containerHeight - displayedHeight),
        };
    }, [containerSize.height, containerSize.width, naturalSize.height, naturalSize.width, wallpaperMode]);

    const canPan = useMemo(() => {
        if (wallpaperMode !== 'fit') return false;
        if (theme?.useKaliWallpaper) return false;
        if (!effectiveUrl) return false;
        return slack.x > 0 || slack.y > 0;
    }, [effectiveUrl, slack.x, slack.y, theme?.useKaliWallpaper, wallpaperMode]);

    const beginPan = (event) => {
        if (!canPan) return false;
        if (event?.altKey || event?.ctrlKey || event?.metaKey || event?.shiftKey) {
            return false;
        }
        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            baseOffset: offsetRef.current,
        };
        setIsDragging(true);
        return true;
    };

    const updatePan = (event) => {
        const dragState = dragStateRef.current;
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        const deltaX = event.clientX - dragState.startX;
        const deltaY = event.clientY - dragState.startY;
        setActiveOffset((prev) => {
            let nextX = dragState.baseOffset.x;
            let nextY = dragState.baseOffset.y;
            if (slack.x > 0) {
                nextX = clamp(dragState.baseOffset.x + deltaX / slack.x, -0.5, 0.5);
            }
            if (slack.y > 0) {
                nextY = clamp(dragState.baseOffset.y + deltaY / slack.y, -0.5, 0.5);
            }
            if (Math.abs(nextX - prev.x) < 1e-4 && Math.abs(nextY - prev.y) < 1e-4) {
                return prev;
            }
            const next = { x: nextX, y: nextY };
            offsetRef.current = next;
            return next;
        });
    };

    const finishPan = (event, cancelled = false) => {
        const dragState = dragStateRef.current;
        if (!dragState || (event && dragState.pointerId !== event.pointerId)) return;
        dragStateRef.current = null;
        setIsDragging(false);
        if (cancelled) {
            const base = dragState.baseOffset || ZERO_OFFSET;
            offsetRef.current = base;
            setActiveOffset(base);
            return;
        }
        const finalOffset = offsetRef.current;
        updateWallpaperOffset(wallpaperKey, finalOffset);
    };

    useImperativeHandle(ref, () => ({
        beginPan,
        updatePan,
        endPan: (event) => finishPan(event, false),
        cancelPan: (event) => finishPan(event, true),
        canPan: () => canPan,
    }));

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

    const handleImageLoad = (event) => {
        const target = event?.currentTarget;
        if (!target) return;
        const width = Number(target.naturalWidth) || 0;
        const height = Number(target.naturalHeight) || 0;
        if (width && height) {
            setNaturalSize({ width, height });
        }
    };

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

    const objectFitMode = useMemo(() => {
        if (!effectiveUrl) return 'cover';
        if (wallpaperMode === 'fit') return 'contain';
        if (wallpaperMode === 'fill') return 'fill';
        if (wallpaperMode === 'contain') return 'contain';
        return 'cover';
    }, [effectiveUrl, wallpaperMode]);

    const objectPosition = useMemo(() => {
        if (wallpaperMode !== 'fit') return '50% 50%';
        const x = 50 + activeOffset.x * 100;
        const y = 50 + activeOffset.y * 100;
        return `${x}% ${y}%`;
    }, [activeOffset.x, activeOffset.y, wallpaperMode]);

    useEffect(() => {
        setActiveOffset((prev) => {
            if (wallpaperMode !== 'fit') {
                const reset = ZERO_OFFSET;
                if (prev.x === reset.x && prev.y === reset.y) return prev;
                offsetRef.current = reset;
                return reset;
            }
            return prev;
        });
    }, [wallpaperMode]);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 -z-10 overflow-hidden pointer-events-none"
            aria-hidden="true"
            style={{
                contentVisibility: 'auto',
                contain: 'paint layout style',
            }}
        >
            {theme?.useKaliWallpaper ? (
                <KaliWallpaper className="h-full w-full" />
            ) : effectiveUrl ? (
                <img
                    key={effectiveUrl}
                    src={effectiveUrl}
                    alt=""
                    className="h-full w-full"
                    style={{
                        objectFit: objectFitMode,
                        objectPosition,
                        transform: objectFitMode === 'cover' ? 'scale(1.05)' : 'none',
                        transition: isDragging ? 'none' : 'object-position 200ms ease-out',
                        pointerEvents: 'none',
                    }}
                    onError={handleImageError}
                    onLoad={handleImageLoad}
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
});

export default BackgroundImage;
