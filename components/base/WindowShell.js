import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

const getBoundsValue = (bounds, key, fallback) => {
    if (!bounds) return fallback;
    if (key in bounds) return bounds[key];
    const altKey =
        key === 'x'
            ? 'left'
            : key === 'y'
                ? 'top'
                : key === 'width'
                    ? 'w'
                    : key === 'height'
                        ? 'h'
                        : key;
    if (altKey in bounds) return bounds[altKey];
    return fallback;
};

const WindowShell = ({
    id,
    title,
    icon,
    initialBounds,
    minW = 320,
    minH = 200,
    onClose,
    onMinimize,
    onMaximize,
    onBoundsCommit,
    children,
}) => {
    const computedBounds = useMemo(() => ({
        x: getBoundsValue(initialBounds, 'x', 0),
        y: getBoundsValue(initialBounds, 'y', 0),
        width: getBoundsValue(initialBounds, 'width', minW),
        height: getBoundsValue(initialBounds, 'height', minH),
    }), [initialBounds, minW, minH]);

    const isMaximized = Boolean(initialBounds?.maximized);

    const handleButtonClick = (callback) => (event) => {
        event?.stopPropagation?.();
        if (typeof callback === 'function') {
            callback({ id, bounds: computedBounds });
        }
    };

    const rootStyle = {
        position: 'absolute',
        top: computedBounds.y,
        left: computedBounds.x,
        width: computedBounds.width,
        height: computedBounds.height,
        minWidth: minW,
        minHeight: minH,
    };

    return (
        <div
            id={id}
            className="window-shell absolute shadow-lg rounded-md overflow-hidden bg-zinc-900/95 border border-zinc-700"
            style={rootStyle}
            data-window-id={id}
        >
            <div className="flex h-full flex-col">
                <header className="flex select-none items-center justify-between gap-2 bg-zinc-800/80 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                        {icon && (
                            typeof icon === 'string' ? (
                                <img
                                    src={icon}
                                    alt=""
                                    className="h-4 w-4 shrink-0"
                                    aria-hidden="true"
                                />
                            ) : (
                                <span className="h-4 w-4 shrink-0" aria-hidden="true">
                                    {icon}
                                </span>
                            )
                        )}
                        <span className="truncate text-sm font-medium text-zinc-100" title={title}>
                            {title}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={handleButtonClick(onMinimize)}
                            className="flex h-7 w-7 items-center justify-center rounded text-zinc-200 transition hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                            aria-label="Minimize window"
                        >
                            <span aria-hidden="true" className="text-base leading-none">&#8722;</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleButtonClick(onMaximize)}
                            className="flex h-7 w-7 items-center justify-center rounded text-zinc-200 transition hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                            aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
                            aria-pressed={isMaximized}
                        >
                            <span aria-hidden="true" className="text-xs leading-none">
                                {isMaximized ? '❐' : '□'}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={handleButtonClick(onClose)}
                            className="flex h-7 w-7 items-center justify-center rounded text-red-200 transition hover:bg-red-600/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                            aria-label="Close window"
                        >
                            <span aria-hidden="true" className="text-sm leading-none">
                                ✕
                            </span>
                        </button>
                    </div>
                </header>
                <div className="relative flex-1 bg-zinc-900 text-zinc-100">
                    <div className="h-full w-full overflow-auto">
                        {children}
                    </div>

                    <div className="pointer-events-auto absolute inset-x-0 top-0 h-1 cursor-n-resize" data-handle="n" />
                    <div className="pointer-events-auto absolute top-0 right-0 h-2 w-2 cursor-ne-resize" data-handle="ne" />
                    <div className="pointer-events-auto absolute inset-y-0 right-0 w-1 cursor-e-resize" data-handle="e" />
                    <div className="pointer-events-auto absolute bottom-0 right-0 h-2 w-2 cursor-se-resize" data-handle="se" />
                    <div className="pointer-events-auto absolute inset-x-0 bottom-0 h-1 cursor-s-resize" data-handle="s" />
                    <div className="pointer-events-auto absolute bottom-0 left-0 h-2 w-2 cursor-sw-resize" data-handle="sw" />
                    <div className="pointer-events-auto absolute inset-y-0 left-0 w-1 cursor-w-resize" data-handle="w" />
                    <div className="pointer-events-auto absolute top-0 left-0 h-2 w-2 cursor-nw-resize" data-handle="nw" />
                </div>
            </div>

            <div className="pointer-events-none" data-portal="snap-preview-primary" />
            <div className="pointer-events-none" data-portal="snap-preview-secondary" />
        </div>
    );
};

WindowShell.propTypes = {
    id: PropTypes.string,
    title: PropTypes.string,
    icon: PropTypes.oneOfType([PropTypes.node, PropTypes.string]),
    initialBounds: PropTypes.object,
    minW: PropTypes.number,
    minH: PropTypes.number,
    onClose: PropTypes.func,
    onMinimize: PropTypes.func,
    onMaximize: PropTypes.func,
    onBoundsCommit: PropTypes.func,
    children: PropTypes.node,
};

export default WindowShell;
