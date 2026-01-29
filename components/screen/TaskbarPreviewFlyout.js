import React from 'react';

const TaskbarPreviewFlyout = React.forwardRef(
        (
                {
                        title,
                        image,
                        status = 'loading',
                        updating = false,
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
                                tabIndex={0}
                                className="fixed z-[275] outline-none"
                                style={{
                                        top: `${top}px`,
                                        left: `${left}px`,
                                        transform: 'translateX(-50%)',
                                        width: 'min(18rem, calc(100vw - 2rem))',
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
                                                <div
                                                        className="relative overflow-hidden rounded-md border border-white/10 bg-black/50"
                                                        role="document"
                                                        aria-label={imageLabel}
                                                >
                                                        {image ? (
                                                                <img
                                                                        src={image}
                                                                        alt={imageLabel}
                                                                        className="max-h-48 w-full object-contain"
                                                                />
                                                        ) : null}
                                                        {status === 'loading' && !image && (
                                                                <div className="flex h-32 w-full items-center justify-center">
                                                                        <span className="text-[0.65rem] uppercase tracking-widest text-white/60">
                                                                                Loading preview…
                                                                        </span>
                                                                </div>
                                                        )}
                                                        {Boolean(updating) && image && (
                                                                <div className="absolute inset-x-0 bottom-0 flex items-center justify-end bg-black/35 px-2 py-1">
                                                                        <span className="text-[0.6rem] uppercase tracking-widest text-white/70">
                                                                                Updating…
                                                                        </span>
                                                                </div>
                                                        )}
                                                        {status === 'empty' && (
                                                                <div className="flex h-32 w-full items-center justify-center">
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
