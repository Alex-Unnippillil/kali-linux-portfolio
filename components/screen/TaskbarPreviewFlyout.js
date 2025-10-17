import React from 'react';

const TaskbarPreviewFlyout = React.forwardRef(
        (
                {
                        title,
                        image,
                        status = 'loading',
                        position = { top: 0, left: 0 },
                        visible = false,
                        onMouseEnter,
                        onMouseLeave,
                        onFocus,
                        onBlur,
                        onKeyDown,
                },
                ref,
        ) => {
                if (!visible) return null;

                const top = Number.isFinite(position.top) ? Math.round(position.top) : 0;
                const left = Number.isFinite(position.left) ? Math.round(position.left) : 0;
                const heading = title ? `${title} preview` : 'Window preview';
                const imageLabel = title ? `${title} window preview` : 'Window preview';

                return (
                        <div
                                ref={ref}
                                role="dialog"
                                aria-label={heading}
                                aria-modal="false"
                                tabIndex={-1}
                                className="fixed z-[275] max-w-[18rem] outline-none"
                                style={{
                                        top: `${top}px`,
                                        left: `${left}px`,
                                        transform: 'translateX(-50%)',
                                }}
                                onMouseEnter={onMouseEnter}
                                onMouseLeave={onMouseLeave}
                                onFocus={onFocus}
                                onBlur={onBlur}
                                onKeyDown={onKeyDown}
                        >
                                <div className="rounded-lg border border-white/10 bg-slate-900/95 p-3 text-white shadow-2xl shadow-black/60 backdrop-blur-md">
                                        <div className="flex flex-col gap-2">
                                                {title && (
                                                        <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                                                                {title}
                                                        </span>
                                                )}
                                                <div className="relative overflow-hidden rounded-md border border-white/10 bg-black/50">
                                                        {status === 'ready' && image ? (
                                                                <img
                                                                        src={image}
                                                                        alt={imageLabel}
                                                                        className="max-h-48 w-64 object-contain"
                                                                />
                                                        ) : null}
                                                        {status === 'loading' && (
                                                                <div className="flex h-32 w-64 items-center justify-center">
                                                                        <span className="text-[0.65rem] uppercase tracking-widest text-white/60">
                                                                                Loading preview…
                                                                        </span>
                                                                </div>
                                                        )}
                                                        {status === 'empty' && (
                                                                <div className="flex h-32 w-64 items-center justify-center">
                                                                        <span className="text-[0.65rem] uppercase tracking-widest text-white/60">
                                                                                Preview unavailable
                                                                        </span>
                                                                </div>
                                                        )}
                                                </div>
                                        </div>
                                </div>
                        </div>
                );
        },
);

TaskbarPreviewFlyout.displayName = 'TaskbarPreviewFlyout';

export default TaskbarPreviewFlyout;
