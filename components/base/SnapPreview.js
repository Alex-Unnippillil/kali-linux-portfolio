"use client";

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './window.module.css';

const SNAP_LABELS = {
    left: 'Snap left half',
    right: 'Snap right half',
    top: 'Snap full screen',
    'top-left': 'Snap top-left quarter',
    'top-right': 'Snap top-right quarter',
    'bottom-left': 'Snap bottom-left quarter',
    'bottom-right': 'Snap bottom-right quarter',
};

const getSnapLabel = (position) => {
    if (!position) return 'Snap window';
    return SNAP_LABELS[position] || 'Snap window';
};

const clampRectToViewport = (snap, viewport) => {
    if (!snap || !viewport) return null;
    const { width: viewportWidth = 0, height: viewportHeight = 0 } = viewport;
    const safeViewportWidth = Math.max(viewportWidth, 0);
    const safeViewportHeight = Math.max(viewportHeight, 0);
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const width = Math.min(Math.max(snap.width, 0), safeViewportWidth);
    const height = Math.min(Math.max(snap.height, 0), safeViewportHeight);
    const maxLeft = Math.max(safeViewportWidth - width, 0);
    const maxTop = Math.max(safeViewportHeight - height, 0);

    const left = clamp(snap.left ?? 0, 0, maxLeft);
    const top = clamp(snap.top ?? 0, 0, maxTop);

    return { left, top, width, height };
};

const computePreviewStyle = (rect) => {
    if (!rect) return null;
    const { left, top, width, height } = rect;
    return {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        backdropFilter: 'brightness(1.1) saturate(1.2)',
        WebkitBackdropFilter: 'brightness(1.1) saturate(1.2)',
    };
};

export default function SnapPreview({ snap, viewport, position }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const hasViewport = Boolean(viewport && viewport.width > 0 && viewport.height > 0);
    const hasSnap = Boolean(snap && mounted && typeof document !== 'undefined');

    const previewRect = useMemo(() => clampRectToViewport(snap, viewport), [snap, viewport]);
    const previewStyle = useMemo(() => computePreviewStyle(previewRect), [previewRect]);
    const label = useMemo(() => getSnapLabel(position), [position]);

    if (!hasSnap || !hasViewport || !previewStyle) {
        return null;
    }

    const overlay = (
        <div
            data-testid="snap-preview"
            className="fixed inset-0 z-40 pointer-events-none transition-opacity"
            aria-live="polite"
            aria-label={label}
            role="status"
        >
            <div className="absolute inset-0 bg-slate-900/40" />
            <div
                className={`absolute pointer-events-none transition-opacity ${styles.snapPreview} ${styles.snapPreviewGlass}`}
                style={previewStyle}
            >
                <span className={styles.snapPreviewLabel} aria-hidden="true">
                    {label}
                </span>
            </div>
        </div>
    );

    return createPortal(overlay, document.body);
}
