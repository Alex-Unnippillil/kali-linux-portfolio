import { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (value, min, max) => {
    let result = value;
    if (typeof min === 'number') {
        result = Math.max(result, min);
    }
    if (typeof max === 'number') {
        result = Math.min(result, max);
    }
    return result;
};

const toNumber = (value, fallback = 0) => {
    const parsed = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseTransform = (transform) => {
    if (!transform || transform === 'none') {
        return null;
    }

    const translateMatch = /translate(?:3d)?\(([-\d.]+)px(?:,|\s*)([-\d.]+)px/.exec(transform);
    if (translateMatch) {
        return {
            x: toNumber(translateMatch[1]),
            y: toNumber(translateMatch[2]),
        };
    }

    const matrixMatch = /matrix\(([^)]+)\)/.exec(transform);
    if (matrixMatch) {
        const values = matrixMatch[1].split(',').map((value) => toNumber(value.trim()));
        if (values.length === 6) {
            return { x: values[4], y: values[5] };
        }
    }

    const matrix3dMatch = /matrix3d\(([^)]+)\)/.exec(transform);
    if (matrix3dMatch) {
        const values = matrix3dMatch[1].split(',').map((value) => toNumber(value.trim()));
        if (values.length === 16) {
            return { x: values[12], y: values[13] };
        }
    }

    return null;
};

const getCurrentPosition = (node) => {
    if (!node) {
        return { x: 0, y: 0 };
    }

    const inline = parseTransform(node.style.transform);
    if (inline) {
        return inline;
    }

    if (typeof window !== 'undefined') {
        const computed = window.getComputedStyle(node);
        const parsed = parseTransform(computed.transform);
        if (parsed) {
            return parsed;
        }
    }

    const storedX = node.style.getPropertyValue('--window-transform-x');
    const storedY = node.style.getPropertyValue('--window-transform-y');
    return {
        x: toNumber(storedX),
        y: toNumber(storedY),
    };
};

export default function useWindowPointerDrag({
    windowRef,
    getBounds,
    onDragStart,
    onDrag,
    onDragEnd,
    onDragCancel,
    snapToGrid,
}) {
    const dragStateRef = useRef(null);
    const rafRef = useRef(null);
    const previousUserSelectRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const cancelAnimation = useCallback(() => {
        if (rafRef.current != null && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const restoreUserSelect = useCallback(() => {
        if (typeof document === 'undefined') {
            return;
        }
        if (document.body) {
            const previous = previousUserSelectRef.current;
            document.body.style.userSelect = typeof previous === 'string' ? previous : '';
        }
        previousUserSelectRef.current = null;
    }, []);

    const endDrag = useCallback((cancelled) => {
        const state = dragStateRef.current;
        if (!state) {
            return;
        }

        dragStateRef.current = null;
        cancelAnimation();

        if (state.handle && typeof state.handle.releasePointerCapture === 'function') {
            try {
                state.handle.releasePointerCapture(state.pointerId);
            } catch (error) {
                // Ignore release errors (pointer might already be released)
            }
        }

        restoreUserSelect();
        setIsDragging(false);

        if (cancelled) {
            if (state.node) {
                state.node.style.transform = `translate(${state.startX}px, ${state.startY}px)`;
            }
            if (typeof onDragCancel === 'function') {
                onDragCancel();
            }
        } else if (typeof onDragEnd === 'function') {
            onDragEnd();
        }
    }, [cancelAnimation, onDragCancel, onDragEnd, restoreUserSelect]);

    const processMovement = useCallback(() => {
        rafRef.current = null;
        const state = dragStateRef.current;
        if (!state || !state.lastPosition) {
            return;
        }

        const { node, originX, originY, startX, startY, lastPosition } = state;
        let nextX = startX + (lastPosition.clientX - originX);
        let nextY = startY + (lastPosition.clientY - originY);

        const snapFn = typeof state.snapToGrid === 'function' ? state.snapToGrid : null;
        if (snapFn) {
            nextX = snapFn(nextX, 'x');
            nextY = snapFn(nextY, 'y');
        }

        const boundsFn = typeof state.getBounds === 'function' ? state.getBounds : null;
        if (boundsFn) {
            const bounds = boundsFn();
            if (bounds) {
                nextX = clamp(nextX, bounds.left, bounds.right);
                nextY = clamp(nextY, bounds.top, bounds.bottom);
            }
        }

        if (typeof onDrag === 'function') {
            onDrag(undefined, { node, x: nextX, y: nextY });
        } else if (node) {
            node.style.transform = `translate(${nextX}px, ${nextY}px)`;
        }

        state.currentX = nextX;
        state.currentY = nextY;
    }, [onDrag]);

    const handlePointerMove = useCallback((event) => {
        const state = dragStateRef.current;
        if (!state || event.pointerId !== state.pointerId) {
            return;
        }
        state.lastPosition = { clientX: event.clientX, clientY: event.clientY };
        if (typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        if (rafRef.current == null && typeof requestAnimationFrame === 'function') {
            rafRef.current = requestAnimationFrame(processMovement);
        }
    }, [processMovement]);

    const handlePointerUp = useCallback((event) => {
        const state = dragStateRef.current;
        if (!state || event.pointerId !== state.pointerId) {
            return;
        }
        endDrag(false);
    }, [endDrag]);

    const handlePointerCancel = useCallback((event) => {
        const state = dragStateRef.current;
        if (!state || event.pointerId !== state.pointerId) {
            return;
        }
        endDrag(true);
    }, [endDrag]);

    const startDrag = useCallback((event) => {
        if (dragStateRef.current) {
            return;
        }
        if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') {
            return;
        }

        const node = windowRef && 'current' in windowRef ? windowRef.current : null;
        if (!node) {
            return;
        }

        if (typeof document !== 'undefined' && document.body) {
            previousUserSelectRef.current = document.body.style.userSelect;
            document.body.style.userSelect = 'none';
        }

        if (typeof onDragStart === 'function') {
            onDragStart();
        }

        const handle = event.currentTarget;
        if (handle && typeof handle.setPointerCapture === 'function') {
            try {
                handle.setPointerCapture(event.pointerId);
            } catch (error) {
                // Ignore capture errors
            }
        }

        const { x, y } = getCurrentPosition(node);

        dragStateRef.current = {
            pointerId: event.pointerId,
            node,
            handle,
            startX: x,
            startY: y,
            originX: event.clientX,
            originY: event.clientY,
            lastPosition: { clientX: event.clientX, clientY: event.clientY },
            getBounds: typeof getBounds === 'function' ? getBounds : null,
            snapToGrid: typeof snapToGrid === 'function' ? snapToGrid : null,
        };

        setIsDragging(true);
        if (typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
    }, [getBounds, onDragStart, snapToGrid, windowRef]);

    useEffect(() => {
        if (!isDragging || typeof window === 'undefined') {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                endDrag(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [endDrag, isDragging]);

    useEffect(() => () => {
        if (dragStateRef.current) {
            endDrag(true);
        } else {
            restoreUserSelect();
        }
        cancelAnimation();
    }, [cancelAnimation, endDrag, restoreUserSelect]);

    return {
        frameProps: {
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerCancel,
        },
        handleProps: {
            onPointerDown: startDrag,
            onPointerMove: handlePointerMove,
            onPointerUp: handlePointerUp,
            onPointerCancel: handlePointerCancel,
        },
    };
}
