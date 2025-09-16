'use client';

import Image from 'next/image';
import React, {
    ForwardedRef,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

const CAPTURE_INTERVAL = 1000;
let htmlToImagePromise: Promise<typeof import('html-to-image')> | null = null;

const loadHtmlToImage = async () => {
    if (!htmlToImagePromise) {
        htmlToImagePromise = import('html-to-image');
    }
    return htmlToImagePromise;
};

export interface TaskbarPreviewProps {
    appId: string;
    title: string;
    iconSrc?: string;
    anchorRect: DOMRect | null;
    minimized?: boolean;
    onCloseApp: () => void;
    onDismiss: () => void;
    onPointerStateChange?: (inside: boolean) => void;
    onFocusWithinChange?: (focusWithin: boolean) => void;
}

const TaskbarPreview = React.forwardRef(function TaskbarPreview(
    {
        appId,
        title,
        iconSrc,
        anchorRect,
        minimized = false,
        onCloseApp,
        onDismiss,
        onPointerStateChange,
        onFocusWithinChange,
    }: TaskbarPreviewProps,
    ref: ForwardedRef<HTMLDivElement>
) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const [thumbnail, setThumbnail] = useState<string | null>(null);

    const capturePreview = useCallback(async () => {
        const node = document.getElementById(appId);
        if (!node) return;

        try {
            const htmlToImage = await loadHtmlToImage();
            const dataUrl = await htmlToImage.toPng(node, {
                cacheBust: true,
                pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
            });
            setThumbnail(dataUrl);
        } catch (error) {
            // ignore capture failures; keep last known thumbnail
        }
    }, [appId]);

    useEffect(() => {
        if (!anchorRect) return;

        let cancelled = false;
        let intervalId: number | null = null;

        const startCapture = async () => {
            await capturePreview();
            if (cancelled) return;
            intervalId = window.setInterval(() => {
                capturePreview();
            }, CAPTURE_INTERVAL);
        };

        startCapture();

        return () => {
            cancelled = true;
            if (intervalId) {
                window.clearInterval(intervalId);
            }
        };
    }, [anchorRect, capturePreview]);

    useEffect(() => {
        if (!anchorRect) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onDismiss();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [anchorRect, onDismiss]);

    useEffect(() => {
        return () => {
            onPointerStateChange?.(false);
            onFocusWithinChange?.(false);
        };
    }, [onPointerStateChange, onFocusWithinChange]);

    const handlePointerEnter = useCallback(() => {
        onPointerStateChange?.(true);
    }, [onPointerStateChange]);

    const handlePointerLeave = useCallback(() => {
        onPointerStateChange?.(false);
    }, [onPointerStateChange]);

    const handleFocusCapture = useCallback(() => {
        onFocusWithinChange?.(true);
    }, [onFocusWithinChange]);

    const handleBlurCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (event.currentTarget.contains(nextTarget)) {
            return;
        }
        onFocusWithinChange?.(false);
    }, [onFocusWithinChange]);

    if (!anchorRect) {
        return null;
    }

    const positionStyle: React.CSSProperties = {
        position: 'fixed',
        top: Math.max(anchorRect.top - 8, 16),
        left: anchorRect.left + anchorRect.width / 2,
        transform: 'translate(-50%, -100%)',
        zIndex: 1000,
        pointerEvents: 'auto',
    };

    const resolvedIcon = iconSrc ? iconSrc.replace('./', '/') : null;

    return (
        <div
            id={`${appId}-taskbar-preview`}
            ref={node => {
                rootRef.current = node;
                if (typeof ref === 'function') {
                    ref(node);
                } else if (ref && typeof ref === 'object') {
                    (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
                }
            }}
            role="dialog"
            aria-modal="false"
            aria-labelledby={`${appId}-preview-title`}
            className="w-72 max-w-[min(18rem,90vw)] rounded-md border border-white/20 bg-zinc-900/95 px-3 py-2 text-white shadow-lg backdrop-blur"
            style={positionStyle}
            tabIndex={-1}
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
            onFocusCapture={handleFocusCapture}
            onBlurCapture={handleBlurCapture}
        >
            <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    {resolvedIcon ? (
                        <Image
                            src={resolvedIcon}
                            alt=""
                            width={20}
                            height={20}
                            className="h-5 w-5 flex-none"
                        />
                    ) : null}
                    <p
                        id={`${appId}-preview-title`}
                        className="truncate text-sm font-medium"
                    >
                        {title}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        onCloseApp();
                        onDismiss();
                    }}
                    className="flex-none rounded bg-white/10 px-2 py-1 text-xs font-medium text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    aria-label={`Close ${title}`}
                >
                    Close
                </button>
            </div>
            <div className="relative aspect-video w-full overflow-hidden rounded bg-black/60">
                {thumbnail ? (
                    <img
                        src={thumbnail}
                        alt={`Live preview of ${title}`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-zinc-300">
                        Preview will appear shortly
                    </div>
                )}
                {minimized ? (
                    <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[10px] uppercase tracking-wide text-zinc-200">
                        Minimized
                    </span>
                ) : null}
            </div>
        </div>
    );
});

export default TaskbarPreview;
