"use client";

import React from 'react';
import { DESKTOP_TOP_PADDING } from '../../utils/uiConstants';

const PLACEHOLDER_COUNT = 6;

function DesktopSkeleton() {
    return (
        <main
            id="desktop"
            role="main"
            aria-busy="true"
            aria-label="Loading desktop"
            className="min-h-screen h-full w-full flex flex-col items-end justify-start content-start flex-wrap-reverse bg-transparent relative overflow-hidden overscroll-none window-parent"
            style={{ paddingTop: DESKTOP_TOP_PADDING, minHeight: '100dvh' }}
        >
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-900/95" aria-hidden />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_55%)]" aria-hidden />
            </div>

            <div className="relative z-10 flex h-full w-full flex-col animate-pulse">
                <header className="flex items-center justify-between px-6 pt-8">
                    <div className="h-12 w-48 rounded-lg bg-slate-700/60" />
                    <div className="flex items-center gap-3">
                        <div className="h-5 w-32 rounded bg-slate-700/50" />
                        <div className="h-5 w-20 rounded bg-slate-700/40" />
                        <div className="h-5 w-16 rounded bg-slate-700/40" />
                    </div>
                </header>

                <div className="flex-1 px-6 pb-24 pt-10">
                    <div className="grid h-full w-full max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                            <div
                                key={index}
                                className="flex h-36 flex-col justify-between rounded-xl border border-slate-700/40 bg-slate-800/60 p-5 shadow-lg shadow-slate-900/40"
                            >
                                <div className="h-12 w-12 rounded-lg bg-slate-700/60" />
                                <div className="space-y-3">
                                    <div className="h-4 w-24 rounded bg-slate-700/50" />
                                    <div className="h-3 w-32 rounded bg-slate-700/40" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <footer className="flex items-center justify-center gap-4 pb-8">
                    <div className="h-14 w-14 rounded-full bg-slate-700/60" />
                    <div className="h-14 w-14 rounded-full bg-slate-700/50" />
                    <div className="h-14 w-14 rounded-full bg-slate-700/40" />
                </footer>
            </div>

            <div id="window-area" className="absolute inset-0" aria-hidden="true" />
        </main>
    );
}

export default DesktopSkeleton;
