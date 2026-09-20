import React from 'react';
import styles from './Taskbar.module.css';

/** Preview actions always delegate to the desktop's window manager. */
const TaskbarPreviewFlyout = React.forwardRef(({
        title,
        image,
        status = 'loading',
        updating = false,
        isMinimized = false,
        position = { top: 0, left: 0 },
        visible = false,
        onActivate,
        onMinimize,
        onClose,
        onMouseEnter,
        onMouseLeave,
        onFocus,
        onBlur,
        onKeyDown,
}, ref) => {
        if (!visible) return null;
        const top = Number.isFinite(position.top) ? Math.round(position.top) : 0;
        const left = Number.isFinite(position.left) ? Math.round(position.left) : 0;
        const heading = title ? `${title} preview` : 'Window preview';
        const action = isMinimized ? 'Restore' : 'Switch to';
        const actionClass = `${styles.previewAction} min-h-[40px] rounded-md px-3 text-xs font-medium transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 motion-reduce:transition-none`;

        return (
                <div
                        ref={ref}
                        role="dialog"
                        aria-label={heading}
                        aria-modal="false"
                        tabIndex={-1}
                        className={`${styles.preview} fixed z-[275] overflow-hidden rounded-xl border border-white/15 bg-slate-900/95 text-white shadow-2xl shadow-black/60 backdrop-blur-xl`}
                        style={{ top: `${top}px`, left: `${left}px`, transform: 'translateX(-50%)' }}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        onKeyDown={onKeyDown}
                >
                        <div className={`${styles.previewHeader} flex items-center gap-2 border-b border-white/10 pl-3 pr-1`}>
                                <span className="min-w-0 flex-1 truncate text-xs font-semibold">{title || 'Application'}</span>
                                <button
                                        type="button"
                                        onClick={onClose}
                                        aria-label={`Close ${title || 'window'}`}
                                        className={`${actionClass} min-w-[40px] hover:bg-red-500/30`}
                                >
                                        <span aria-hidden="true">✕</span>
                                </button>
                        </div>
                        <button
                                type="button"
                                data-preview-activate="true"
                                onClick={onActivate}
                                aria-label={`${action} ${title || 'window'}`}
                                className={`${styles.previewImage} relative flex w-full items-center justify-center overflow-hidden bg-black/40 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400`}
                        >
                                {image ? (
                                        <img
                                                src={image}
                                                alt={`${title || 'Application'} window preview`}
                                                className="max-h-40 w-full rounded object-contain"
                                        />
                                ) : (
                                        <span className="text-xs text-white/60">
                                                {status === 'loading' ? 'Loading preview…' : 'Preview unavailable'}
                                        </span>
                                )}
                                {updating && image ? (
                                        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[10px] text-white/70">Updating…</span>
                                ) : null}
                        </button>
                        <div className="flex items-center justify-between gap-2 border-t border-white/10 p-1">
                                <span className="pl-2 text-[11px] text-white/60">{isMinimized ? 'Minimized' : 'Running'}</span>
                                <button
                                        type="button"
                                        onClick={isMinimized ? onActivate : onMinimize}
                                        aria-label={`${isMinimized ? 'Restore' : 'Minimize'} ${title || 'window'} window`}
                                        className={actionClass}
                                >
                                        {isMinimized ? 'Restore' : 'Minimize'}
                                </button>
                        </div>
                </div>
        );
});
TaskbarPreviewFlyout.displayName = 'TaskbarPreviewFlyout';
export default TaskbarPreviewFlyout;
