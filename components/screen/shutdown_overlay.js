'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

const ANIMATION_DURATION = 200;

const SuspendIcon = (props) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
                <path
                        d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                />
        </svg>
);

const RestartIcon = (props) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
                <path
                        d="M16.023 9.348h4.477V4.87m0 0L18.37 7.003m2.13-2.132L13.672 11.7a4.5 4.5 0 11-2.642-5.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                />
                <path
                        d="M8.598 15.652H4.12v4.478m0 0l2.13-2.132m-2.13 2.132 6.828-6.829a4.5 4.5 0 102.642 5.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                />
        </svg>
);

const PowerIcon = (props) => (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" {...props}>
                <path d="M12 5v6" strokeLinecap="round" strokeLinejoin="round" />
                <path
                        d="M16.95 7.05a7 7 0 11-9.9 0"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                />
        </svg>
);

const ShutdownOverlay = ({ open, onClose, onSuspend, onRestart, onPowerOff }) => {
        const [render, setRender] = useState(open);
        const [visible, setVisible] = useState(open);
        const optionRefs = useRef([]);
        const cancelRef = useRef(null);
        const previousFocusRef = useRef(null);

        const actions = useMemo(
                () => [
                        {
                                id: 'suspend',
                                label: 'Suspend',
                                description: 'Pause your session and lock the screen.',
                                Icon: SuspendIcon,
                                handler: onSuspend
                        },
                        {
                                id: 'restart',
                                label: 'Restart',
                                description: 'Reboot Kali Linux Portfolio.',
                                Icon: RestartIcon,
                                handler: onRestart
                        },
                        {
                                id: 'poweroff',
                                label: 'Power Off',
                                description: 'Shut down completely and require a manual start.',
                                Icon: PowerIcon,
                                handler: onPowerOff
                        }
                ],
                [onPowerOff, onRestart, onSuspend]
        );

        useEffect(() => {
                let timeout;
                let frame;
                if (open) {
                        setRender(true);
                        previousFocusRef.current =
                                document.activeElement instanceof HTMLElement ? document.activeElement : null;
                        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
                                frame = window.requestAnimationFrame(() => setVisible(true));
                        } else {
                                setVisible(true);
                        }
                } else {
                        setVisible(false);
                        if (typeof window !== 'undefined') {
                                timeout = window.setTimeout(() => setRender(false), ANIMATION_DURATION);
                        } else {
                                setRender(false);
                        }
                }
                return () => {
                        if (typeof window !== 'undefined') {
                                if (frame && typeof window.cancelAnimationFrame === 'function') {
                                        window.cancelAnimationFrame(frame);
                                }
                                if (timeout) {
                                        window.clearTimeout(timeout);
                                }
                        }
                };
        }, [open]);

        useEffect(() => {
                if (render && open && typeof window !== 'undefined') {
                        const focusTimer = window.setTimeout(() => {
                                optionRefs.current[0]?.focus();
                        }, 50);
                        return () => window.clearTimeout(focusTimer);
                }
        }, [render, open]);

        useEffect(() => {
                if (!render && previousFocusRef.current) {
                        previousFocusRef.current.focus();
                        previousFocusRef.current = null;
                }
        }, [render]);

        const focusByDelta = useCallback((delta) => {
                const focusables = optionRefs.current.filter(Boolean);
                if (focusables.length === 0) return;
                const active = document.activeElement;
                let index = focusables.findIndex((el) => el === active);
                if (index === -1) {
                        index = delta > 0 ? -1 : focusables.length;
                }
                index = (index + delta + focusables.length) % focusables.length;
                focusables[index]?.focus();
        }, []);

        const focusOption = useCallback((index) => {
                const focusables = optionRefs.current.filter(Boolean);
                if (focusables[index]) {
                        focusables[index].focus();
                }
        }, []);

        const activateFocused = useCallback(() => {
                const active = document.activeElement;
                const focusables = optionRefs.current.filter(Boolean);
                const optionIndex = focusables.findIndex((el) => el === active);
                if (optionIndex !== -1) {
                        actions[optionIndex].handler();
                } else if (cancelRef.current === active) {
                        onClose();
                }
        }, [actions, onClose]);

        const handleKeyDown = useCallback(
                (event) => {
                        if (event.key === 'Tab') {
                                const focusables = [...optionRefs.current.filter(Boolean), cancelRef.current].filter(Boolean);
                                if (focusables.length === 0) return;
                                const first = focusables[0];
                                const last = focusables[focusables.length - 1];
                                if (!event.shiftKey && document.activeElement === last) {
                                        event.preventDefault();
                                        first.focus();
                                } else if (event.shiftKey && document.activeElement === first) {
                                        event.preventDefault();
                                        last.focus();
                                }
                                return;
                        }

                        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                                event.preventDefault();
                                focusByDelta(1);
                        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                                event.preventDefault();
                                focusByDelta(-1);
                        } else if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                activateFocused();
                        } else if (event.key === 'Escape') {
                                event.preventDefault();
                                onClose();
                        } else if (event.key === 'Home') {
                                event.preventDefault();
                                focusOption(0);
                        } else if (event.key === 'End') {
                                event.preventDefault();
                                focusOption(actions.length - 1);
                        }
                },
                [activateFocused, actions.length, focusByDelta, focusOption, onClose]
        );

        if (!render) {
                return null;
        }

        return (
                <div
                        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8 text-white transition-opacity duration-200 ease-out motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                        <div
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="power-menu-title"
                                aria-describedby="power-menu-instructions"
                                className={`w-full max-w-2xl rounded-3xl border border-white/10 bg-[#10151d]/90 p-6 shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out motion-reduce:transition-none ${visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                                onKeyDown={handleKeyDown}
                                tabIndex={-1}
                        >
                                <div className="text-center">
                                        <h2 id="power-menu-title" className="text-2xl font-semibold tracking-wide">
                                                Power options
                                        </h2>
                                        <p id="power-menu-instructions" className="mt-2 text-sm text-gray-300">
                                                Use the arrow keys to choose an option and press Enter to confirm.
                                        </p>
                                </div>
                                <div className="mt-8 grid gap-4 sm:grid-cols-3" role="list">
                                        {actions.map(({ id, label, description, Icon, handler }, index) => (
                                                <button
                                                        key={id}
                                                        ref={(element) => {
                                                                optionRefs.current[index] = element || null;
                                                        }}
                                                        type="button"
                                                        onClick={handler}
                                                        className="group flex h-full flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center transition-all duration-200 ease-out hover:border-white/30 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1317]"
                                                        aria-describedby={`power-menu-${id}-description`}
                                                >
                                                        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white transition duration-200 ease-out group-hover:border-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/20 group-focus:border-[var(--color-primary)] group-focus:bg-[var(--color-primary)]/20">
                                                                <Icon className="h-10 w-10" />
                                                        </span>
                                                        <span className="text-lg font-medium">{label}</span>
                                                        <span id={`power-menu-${id}-description`} className="text-sm text-gray-300">
                                                                {description}
                                                        </span>
                                                </button>
                                        ))}
                                </div>
                                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <span className="text-xs uppercase tracking-wide text-gray-400">
                                                Enter • confirm &nbsp;|&nbsp; Esc • cancel
                                        </span>
                                        <button
                                                type="button"
                                                ref={cancelRef}
                                                onClick={onClose}
                                                className="self-end rounded-md border border-white/20 px-4 py-2 text-sm font-medium transition duration-200 ease-out hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1317]"
                                        >
                                                Cancel
                                        </button>
                                </div>
                        </div>
                </div>
        );
};

export default ShutdownOverlay;
