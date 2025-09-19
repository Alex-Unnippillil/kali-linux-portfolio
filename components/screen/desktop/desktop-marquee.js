import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_DRAG_DISTANCE = 3;

const noop = () => false;

function intersects(selectionRect, itemRect) {
    return (
        selectionRect.left <= itemRect.right &&
        selectionRect.right >= itemRect.left &&
        selectionRect.top <= itemRect.bottom &&
        selectionRect.bottom >= itemRect.top
    );
}

export default function DesktopMarquee({
    containerRef,
    getItems,
    isEnabled = noop,
    measureItems,
    onSelectionStart,
    onSelectionChange,
    onSelectionEnd,
}) {
    const [rect, setRect] = useState(null);
    const pointerState = useRef({ active: false });
    const pendingPoint = useRef(null);
    const rafRef = useRef(null);

    const clearPerformanceMarks = useCallback(() => {
        if (typeof performance === 'undefined') return;
        try { performance.clearMarks('desktop-marquee-update-start'); } catch (e) { /* ignore */ }
        try { performance.clearMarks('desktop-marquee-update-end'); } catch (e) { /* ignore */ }
        try { performance.clearMeasures('desktop-marquee-update'); } catch (e) { /* ignore */ }
    }, []);

    const flushFrame = useCallback(() => {
        rafRef.current = null;
        if (!pointerState.current.active || !pendingPoint.current) {
            return;
        }
        const { origin, containerRect, ctrlKey, shiftKey } = pointerState.current;
        const latest = pendingPoint.current;
        const left = Math.min(origin.x, latest.x);
        const top = Math.min(origin.y, latest.y);
        const right = Math.max(origin.x, latest.x);
        const bottom = Math.max(origin.y, latest.y);
        const width = right - left;
        const height = bottom - top;
        pointerState.current.hasMoved = width > MIN_DRAG_DISTANCE || height > MIN_DRAG_DISTANCE;
        if (!pointerState.current.hasMoved) {
            setRect(null);
            return;
        }
        const selectionRect = { left, top, right, bottom, width, height };
        pointerState.current.selectionRect = selectionRect;
        const offsetLeft = left - (containerRect?.left ?? 0);
        const offsetTop = top - (containerRect?.top ?? 0);
        setRect({
            left: offsetLeft,
            top: offsetTop,
            width,
            height,
        });
        const items = typeof getItems === 'function' ? getItems() : [];
        const hits = [];
        for (let i = 0; i < items.length; i += 1) {
            const item = items[i];
            if (!item || !item.rect) continue;
            if (intersects(selectionRect, item.rect)) {
                hits.push(item.id);
            }
        }
        if (typeof onSelectionChange === 'function') {
            onSelectionChange(hits, { ctrlKey, shiftKey });
        }
    }, [getItems, onSelectionChange]);

    const scheduleFrame = useCallback(() => {
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
                performance.mark('desktop-marquee-update-start');
            }
            flushFrame();
            if (typeof performance !== 'undefined' && typeof performance.mark === 'function' && typeof performance.measure === 'function') {
                try {
                    performance.mark('desktop-marquee-update-end');
                    performance.measure('desktop-marquee-update', 'desktop-marquee-update-start', 'desktop-marquee-update-end');
                } catch (e) {
                    // ignore measure errors (e.g. if marks missing)
                }
            }
            clearPerformanceMarks();
        });
    }, [clearPerformanceMarks, flushFrame]);

    useEffect(() => () => {
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    useEffect(() => {
        const container = containerRef?.current;
        if (!container) return undefined;

        const resetPointerState = () => {
            pointerState.current = { active: false };
            pendingPoint.current = null;
        };

        const finishInteraction = (cancelled) => {
            if (!pointerState.current.active) return;
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            if (pointerState.current.hasMoved) {
                flushFrame();
            }
            if (!cancelled && typeof onSelectionEnd === 'function') {
                onSelectionEnd({
                    ctrlKey: pointerState.current.ctrlKey,
                    shiftKey: pointerState.current.shiftKey,
                    moved: Boolean(pointerState.current.hasMoved),
                });
            }
            setRect(null);
            try {
                if (pointerState.current.pointerId !== undefined && container.releasePointerCapture) {
                    container.releasePointerCapture(pointerState.current.pointerId);
                }
            } catch (e) {
                // ignore capture release errors
            }
            resetPointerState();
        };

        const handlePointerDown = (event) => {
            if (event.button !== 0) return;
            if (typeof isEnabled === 'function' && !isEnabled()) return;
            const contextTarget = event.target.closest('[data-context]');
            const context = contextTarget ? contextTarget.dataset.context : null;
            if (context && context !== 'desktop-area') return;
            if (event.target.closest('.opened-window')) return;
            if (measureItems) measureItems();
            pointerState.current = {
                active: true,
                origin: { x: event.clientX, y: event.clientY },
                ctrlKey: Boolean(event.ctrlKey || event.metaKey),
                shiftKey: Boolean(event.shiftKey),
                containerRect: container.getBoundingClientRect(),
                pointerId: event.pointerId,
                hasMoved: false,
            };
            pendingPoint.current = { x: event.clientX, y: event.clientY };
            if (container.setPointerCapture) {
                try {
                    container.setPointerCapture(event.pointerId);
                } catch (e) {
                    // ignore capture errors
                }
            }
            if (typeof onSelectionStart === 'function') {
                onSelectionStart({
                    ctrlKey: pointerState.current.ctrlKey,
                    shiftKey: pointerState.current.shiftKey,
                });
            }
            scheduleFrame();
        };

        const handlePointerMove = (event) => {
            if (!pointerState.current.active) return;
            pendingPoint.current = { x: event.clientX, y: event.clientY };
            scheduleFrame();
        };

        const handlePointerUp = () => finishInteraction(false);
        const handlePointerCancel = () => finishInteraction(true);

        container.addEventListener('pointerdown', handlePointerDown);
        container.addEventListener('pointermove', handlePointerMove);
        container.addEventListener('pointerup', handlePointerUp);
        container.addEventListener('pointercancel', handlePointerCancel);
        container.addEventListener('lostpointercapture', handlePointerCancel);

        return () => {
            container.removeEventListener('pointerdown', handlePointerDown);
            container.removeEventListener('pointermove', handlePointerMove);
            container.removeEventListener('pointerup', handlePointerUp);
            container.removeEventListener('pointercancel', handlePointerCancel);
            container.removeEventListener('lostpointercapture', handlePointerCancel);
        };
    }, [containerRef, isEnabled, measureItems, onSelectionEnd, onSelectionStart, scheduleFrame]);

    if (!rect) return null;

    return (
        <div
            aria-hidden="true"
            className="absolute z-20 border border-blue-400 bg-blue-500 bg-opacity-20 pointer-events-none"
            style={{ left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` }}
        />
    );
}
