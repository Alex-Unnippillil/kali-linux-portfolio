"use client";

import React, {
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import PropTypes from "prop-types";

const HANDLES = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];

const HANDLE_STYLES = {
    n: {
        top: 0,
        left: "50%",
        width: "100%",
        height: 12,
        transform: "translate(-50%, -50%)",
        cursor: "ns-resize",
    },
    ne: {
        top: 0,
        right: 0,
        width: 18,
        height: 18,
        transform: "translate(50%, -50%)",
        cursor: "nesw-resize",
    },
    e: {
        top: "50%",
        right: 0,
        width: 12,
        height: "100%",
        transform: "translate(50%, -50%)",
        cursor: "ew-resize",
    },
    se: {
        bottom: 0,
        right: 0,
        width: 18,
        height: 18,
        transform: "translate(50%, 50%)",
        cursor: "nwse-resize",
    },
    s: {
        bottom: 0,
        left: "50%",
        width: "100%",
        height: 12,
        transform: "translate(-50%, 50%)",
        cursor: "ns-resize",
    },
    sw: {
        bottom: 0,
        left: 0,
        width: 18,
        height: 18,
        transform: "translate(-50%, 50%)",
        cursor: "nesw-resize",
    },
    w: {
        top: "50%",
        left: 0,
        width: 12,
        height: "100%",
        transform: "translate(-50%, -50%)",
        cursor: "ew-resize",
    },
    nw: {
        top: 0,
        left: 0,
        width: 18,
        height: 18,
        transform: "translate(-50%, -50%)",
        cursor: "nwse-resize",
    },
};

const clamp = (value, min, max) => {
    let result = value;
    if (Number.isFinite(min)) {
        result = Math.max(result, min);
    }
    if (Number.isFinite(max)) {
        result = Math.min(result, max);
    }
    return result;
};

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

const assignRef = (ref, value) => {
    if (typeof ref === "function") {
        ref(value);
    } else if (ref && typeof ref === "object") {
        ref.current = value;
    }
};

const getViewportSize = () => {
    if (typeof window === "undefined") {
        return { width: Infinity, height: Infinity };
    }
    const { innerWidth, innerHeight } = window;
    const docEl = typeof document !== "undefined" ? document.documentElement : null;
    return {
        width: Number.isFinite(innerWidth)
            ? innerWidth
            : docEl?.clientWidth || Infinity,
        height: Number.isFinite(innerHeight)
            ? innerHeight
            : docEl?.clientHeight || Infinity,
    };
};

const rectEquals = (a, b) => {
    if (!a || !b) return false;
    return (
        a.left === b.left &&
        a.top === b.top &&
        a.width === b.width &&
        a.height === b.height
    );
};

const computeResizeRect = (
    dir,
    deltaX,
    deltaY,
    startBounds,
    aspectRatio,
    shiftKey,
    constraints,
    viewport,
) => {
    const startRight = startBounds.left + startBounds.width;
    const startBottom = startBounds.top + startBounds.height;

    let left = startBounds.left;
    let top = startBounds.top;
    let width = startBounds.width;
    let height = startBounds.height;

    if (dir.includes("e")) {
        width = startBounds.width + deltaX;
    }
    if (dir.includes("s")) {
        height = startBounds.height + deltaY;
    }
    if (dir.includes("w")) {
        width = startBounds.width - deltaX;
        left = startBounds.left + deltaX;
    }
    if (dir.includes("n")) {
        height = startBounds.height - deltaY;
        top = startBounds.top + deltaY;
    }

    width = Math.max(width, 0);
    height = Math.max(height, 0);

    const maintainAspect = shiftKey && aspectRatio && aspectRatio > 0;
    if (maintainAspect) {
        const widthDelta = Math.abs(width - startBounds.width);
        const heightDelta = Math.abs(height - startBounds.height);
        if (dir === "e" || dir === "w") {
            height = width / aspectRatio;
            if (dir.includes("n")) {
                top = startBottom - height;
            } else {
                top = startBounds.top;
            }
        } else if (dir === "n" || dir === "s") {
            width = height * aspectRatio;
            if (dir.includes("w")) {
                left = startRight - width;
            } else {
                left = startBounds.left;
            }
        } else if (widthDelta >= heightDelta) {
            height = width / aspectRatio;
            if (dir.includes("n")) {
                top = startBottom - height;
            } else {
                top = startBounds.top;
            }
        } else {
            width = height * aspectRatio;
            if (dir.includes("w")) {
                left = startRight - width;
            } else {
                left = startBounds.left;
            }
        }
    }

    const viewportWidth = viewport?.width ?? Infinity;
    const viewportHeight = viewport?.height ?? Infinity;

    const maxWidthConstraint = Math.min(
        isFiniteNumber(constraints.maxW) ? constraints.maxW : Infinity,
        viewportWidth,
    );
    const maxHeightConstraint = Math.min(
        isFiniteNumber(constraints.maxH) ? constraints.maxH : Infinity,
        viewportHeight,
    );
    const minWidthConstraint = Math.min(
        isFiniteNumber(constraints.minW) ? constraints.minW : 0,
        maxWidthConstraint,
    );
    const minHeightConstraint = Math.min(
        isFiniteNumber(constraints.minH) ? constraints.minH : 0,
        maxHeightConstraint,
    );

    width = clamp(width, minWidthConstraint, maxWidthConstraint);
    height = clamp(height, minHeightConstraint, maxHeightConstraint);

    if (dir.includes("w")) {
        left = startRight - width;
    }
    if (dir.includes("n")) {
        top = startBottom - height;
    }

    if (!Number.isFinite(left)) left = 0;
    if (!Number.isFinite(top)) top = 0;

    const maxLeft = Number.isFinite(viewportWidth) ? viewportWidth - width : Infinity;
    const maxTop = Number.isFinite(viewportHeight) ? viewportHeight - height : Infinity;

    left = clamp(left, 0, maxLeft);
    top = clamp(top, 0, maxTop);

    if (Number.isFinite(viewportWidth) && left + width > viewportWidth) {
        left = Math.max(0, viewportWidth - width);
    }
    if (Number.isFinite(viewportHeight) && top + height > viewportHeight) {
        top = Math.max(0, viewportHeight - height);
    }

    return {
        left,
        top,
        width,
        height,
    };
};

const WindowShell = forwardRef(function WindowShell(
    {
        bounds,
        minW = 160,
        minH = 120,
        maxW,
        maxH,
        className = "",
        handleClassName = "",
        style = {},
        children,
        onBoundsCommit,
        onResizeStart,
        onResize,
        onResizeEnd,
        ...rest
    },
    forwardedRef,
) {
    const localRef = useRef(null);
    useEffect(() => {
        assignRef(forwardedRef, localRef.current);
        return () => assignRef(forwardedRef, null);
    }, [forwardedRef]);

    const [previewBounds, setPreviewBounds] = useState(null);
    const [resizing, setResizing] = useState(null);

    const resizingRef = useRef(resizing);
    useEffect(() => {
        resizingRef.current = resizing;
    }, [resizing]);

    const previewRef = useRef(previewBounds);
    useEffect(() => {
        previewRef.current = previewBounds;
    }, [previewBounds]);

    const effectiveBounds = previewBounds || bounds || { left: 0, top: 0, width: 0, height: 0 };

    const handlePointerDown = useCallback(
        (dir) => (event) => {
            if (resizingRef.current) {
                return;
            }
            if (event.button !== undefined && event.button !== 0) {
                return;
            }
            if (!bounds) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();

            const handleNode = event.currentTarget;
            const pointerId = event.pointerId;
            if (handleNode?.setPointerCapture) {
                try {
                    handleNode.setPointerCapture(pointerId);
                } catch (error) {
                    // ignore capture errors
                }
            }

            const startBounds = {
                left: bounds.left,
                top: bounds.top,
                width: bounds.width,
                height: bounds.height,
            };

            const dragStart = { x: event.clientX, y: event.clientY };
            const nextState = {
                dir,
                pointerId,
                dragStart,
                startBounds,
                aspectRatio:
                    bounds.width > 0 && bounds.height > 0
                        ? bounds.width / bounds.height
                        : null,
                handleNode,
            };

            setResizing(nextState);
            resizingRef.current = nextState;
            const initialPreview = { ...startBounds };
            setPreviewBounds(initialPreview);
            previewRef.current = initialPreview;
            if (typeof onResizeStart === "function") {
                onResizeStart(initialPreview);
            }
        },
        [bounds, onResizeStart],
    );

    useEffect(() => {
        if (!resizingRef.current) {
            return undefined;
        }

        const constraints = { minW, minH, maxW, maxH };

        const handleMove = (event) => {
            const active = resizingRef.current;
            if (!active || event.pointerId !== active.pointerId) {
                return;
            }
            const deltaX = event.clientX - active.dragStart.x;
            const deltaY = event.clientY - active.dragStart.y;
            const viewport = getViewportSize();
            const nextRect = computeResizeRect(
                active.dir,
                deltaX,
                deltaY,
                active.startBounds,
                active.aspectRatio,
                event.shiftKey,
                constraints,
                viewport,
            );
            if (typeof onResize === "function") {
                onResize(nextRect);
            }
            setPreviewBounds((prev) => {
                if (prev && rectEquals(prev, nextRect)) {
                    return prev;
                }
                previewRef.current = nextRect;
                return nextRect;
            });
        };

        const handleUp = (event) => {
            const active = resizingRef.current;
            if (!active || event.pointerId !== active.pointerId) {
                return;
            }
            if (active.handleNode?.releasePointerCapture) {
                try {
                    active.handleNode.releasePointerCapture(active.pointerId);
                } catch (error) {
                    // ignore release errors
                }
            }

            const committed = previewRef.current
                ? { ...previewRef.current }
                : { ...active.startBounds };

            setResizing(null);
            resizingRef.current = null;
            setPreviewBounds(null);
            previewRef.current = null;

            if (typeof onBoundsCommit === "function") {
                onBoundsCommit(committed);
            }
            if (typeof onResizeEnd === "function") {
                onResizeEnd(committed);
            }
        };

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
        window.addEventListener("pointercancel", handleUp);

        return () => {
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
            window.removeEventListener("pointercancel", handleUp);
        };
    }, [maxH, maxW, minH, minW, onBoundsCommit, onResize, onResizeEnd]);

    const handleElements = useMemo(
        () =>
            HANDLES.map((dir) => {
                const dirClass = `window-shell__resize-handle window-shell__resize-handle--${dir}`;
                const composedClass = handleClassName
                    ? `${dirClass} ${handleClassName}`
                    : dirClass;
                return (
                    <div
                        key={dir}
                        data-dir={dir}
                        className={composedClass}
                        onPointerDown={handlePointerDown(dir)}
                        role="presentation"
                        style={{
                            position: "absolute",
                            touchAction: "none",
                            ...HANDLE_STYLES[dir],
                        }}
                    />
                );
            }),
        [handleClassName, handlePointerDown],
    );

    const inlineStyle = {
        position: "absolute",
        width: `${effectiveBounds.width}px`,
        height: `${effectiveBounds.height}px`,
        transform: `translate(${effectiveBounds.left}px, ${effectiveBounds.top}px)`,
        ...style,
    };

    const resizeStateClass = resizing ? " window-shell--resizing" : "";
    const composedClassName = `window-shell${resizeStateClass}${className ? ` ${className}` : ""}`;

    return (
        <div
            ref={localRef}
            className={composedClassName}
            style={inlineStyle}
            data-resizing={Boolean(resizing)}
            data-resizing-dir={resizing?.dir || ""}
            {...rest}
        >
            {children}
            {handleElements}
        </div>
    );
});

WindowShell.propTypes = {
    bounds: PropTypes.shape({
        left: PropTypes.number.isRequired,
        top: PropTypes.number.isRequired,
        width: PropTypes.number.isRequired,
        height: PropTypes.number.isRequired,
    }).isRequired,
    children: PropTypes.node,
    className: PropTypes.string,
    handleClassName: PropTypes.string,
    maxH: PropTypes.number,
    maxW: PropTypes.number,
    minH: PropTypes.number,
    minW: PropTypes.number,
    onBoundsCommit: PropTypes.func,
    onResize: PropTypes.func,
    onResizeEnd: PropTypes.func,
    onResizeStart: PropTypes.func,
    style: PropTypes.object,
};

WindowShell.defaultProps = {
    children: null,
    className: "",
    handleClassName: "",
    maxH: undefined,
    maxW: undefined,
    minH: 120,
    minW: 160,
    onBoundsCommit: undefined,
    onResize: undefined,
    onResizeEnd: undefined,
    onResizeStart: undefined,
    style: undefined,
};

export default WindowShell;

