"use client";

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useSettings } from '../../hooks/useSettings'

export const BOOT_MESSAGES = [
    'Securing environment',
    'Loading offensive simulations',
    'Calibrating desktop widgets',
]

export const BOOT_MESSAGE_INTERVAL_MS = 360

function BootingScreen(props) {
    const { reducedMotion: settingsReducedMotion } = useSettings()
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(
        typeof settingsReducedMotion === 'boolean' ? settingsReducedMotion : false,
    )

    const { disableMessageSequence } = props
    const isVisible = props.visible || props.isShutDown
    const visibilityClass = isVisible ? 'visible opacity-100' : 'invisible opacity-0'
    const [activeMessageIndex, setActiveMessageIndex] = useState(0)

    const isBooting = props.visible && !props.isShutDown

    // Mirror user preference from settings and fall back to media query for deterministic motion control.
    useEffect(() => {
        if (typeof settingsReducedMotion === 'boolean') {
            setPrefersReducedMotion(settingsReducedMotion)
            return undefined
        }

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)

        handleChange()
        mediaQuery.addEventListener('change', handleChange)

        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [settingsReducedMotion])

    useEffect(() => {
        let intervalId = null

        if (!isBooting) {
            setActiveMessageIndex(0)
        } else if (disableMessageSequence) {
            setActiveMessageIndex(0)
        } else {
            setActiveMessageIndex(0)

            intervalId = window.setInterval(() => {
                setActiveMessageIndex((prevIndex) => {
                    if (prevIndex >= BOOT_MESSAGES.length - 1) {
                        window.clearInterval(intervalId)
                        return prevIndex
                    }

                    return prevIndex + 1
                })
            }, BOOT_MESSAGE_INTERVAL_MS)
        }

        // Ensure interval cleanup survives rapid visibility toggles.
        return () => {
            if (intervalId !== null) {
                window.clearInterval(intervalId)
            }
        }
    }, [disableMessageSequence, isBooting])

    const bootMessages = BOOT_MESSAGES

    const transitionVisibilityClass = prefersReducedMotion
        ? 'transition-opacity duration-200'
        : 'transition-opacity duration-700'

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy={isBooting}
            style={{
                ...(isVisible ? { zIndex: '2147483647' } : { zIndex: '-20' }), // Keep hidden layers beneath focusable UI.
                contentVisibility: 'auto',
            }}
            className={`${visibilityClass} absolute inset-0 select-none overflow-hidden ${transitionVisibilityClass}`}
        >
            <div className={`${visibilityClass} relative flex h-full w-full flex-col items-center justify-center gap-12 bg-[#030712] text-slate-100`}>
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#030712] to-black" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_58%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(15,118,110,0.18),_transparent_60%)]" />
                </div>

                <div className="relative flex flex-col items-center gap-6 px-6 text-center">
                    <span className="text-xs uppercase tracking-[0.5em] text-slate-400">Initializing workspace</span>
                    <div className={`${visibilityClass} relative`}>
                        <div className="absolute -inset-6 rounded-full bg-sky-500/20 blur-3xl" aria-hidden />
                        <Image
                            width={360}
                            height={360}
                            className="w-48 md:w-64"
                            src="/themes/Yaru/status/icons8-kali-linux.svg"
                            alt="Kali Linux logo"
                            sizes="(max-width: 768px) 12rem, 16rem"
                            priority
                        />
                    </div>
                    <span className="text-4xl font-semibold tracking-[0.35em] text-sky-200 md:text-5xl">KALI</span>
                </div>

                <div className="relative flex flex-col items-center gap-6 px-6">
                    <button
                        type="button"
                        onClick={props.turnOn}
                        disabled={!props.isShutDown}
                        aria-disabled={!props.isShutDown}
                        className={`group relative flex h-20 w-20 items-center justify-center rounded-full border border-slate-700/40 ${
                            prefersReducedMotion ? 'transition-colors duration-150' : 'transition duration-300'
                        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
                            props.isShutDown
                                ? `cursor-pointer hover:border-sky-400/60 ${prefersReducedMotion ? '' : 'hover:scale-105'}`
                                : 'cursor-default opacity-80'
                        }`}
                        aria-label={props.isShutDown ? 'Start Kali desktop' : 'Booting Kali desktop'}
                    >
                        {props.isShutDown ? (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-900 transition group-hover:bg-white">
                                <Image width={32} height={32} src="/themes/Yaru/status/power-button.svg" alt="Power button" sizes="32px" priority />
                            </div>
                        ) : (
                            <div className="relative flex h-14 w-14 items-center justify-center">
                                <div className="absolute inset-0 rounded-full border border-slate-700/40" />
                                <div
                                    className={`absolute inset-0 rounded-full border-4 border-sky-400/80 border-t-transparent border-l-transparent ${
                                        prefersReducedMotion ? '' : 'animate-[spin_2.6s_linear_infinite]'
                                    }`}
                                />
                                <div className="absolute inset-[30%] rounded-full bg-slate-900" />
                            </div>
                        )}
                    </button>

                    <ul className="flex flex-col gap-2 text-sm text-slate-300">
                        {bootMessages.map((message, index) => {
                            const isActive = isBooting && index === activeMessageIndex
                            const isComplete = isBooting && index < activeMessageIndex
                            const state = isActive ? 'active' : isComplete ? 'complete' : 'upcoming'
                            const itemTransitionClass = prefersReducedMotion ? 'transition-none duration-0' : 'transition-all duration-500'
                            const textTransitionClass = prefersReducedMotion ? 'transition-none duration-0' : 'transition-opacity duration-500'

                            return (
                                <li
                                    key={message}
                                    data-state={state}
                                    className={`flex items-center gap-3 ${itemTransitionClass} ${
                                        isActive
                                            ? 'translate-x-0 text-sky-100 drop-shadow-[0_0_16px_rgba(56,189,248,0.55)]'
                                            : isComplete
                                              ? 'translate-x-0 text-slate-400 opacity-80'
                                              : 'translate-x-2 text-slate-500 opacity-60'
                                    }`}
                                >
                                    <span
                                        className={`inline-flex h-2 w-2 rounded-full ${itemTransitionClass} ${
                                            isActive
                                                ? 'bg-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.7)]'
                                                : isComplete
                                                  ? 'bg-emerald-400/70 shadow-[0_0_6px_rgba(16,185,129,0.6)]'
                                                  : 'bg-slate-600/60'
                                        } ${!prefersReducedMotion && isActive ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`}
                                        aria-hidden
                                    />
                                    <span className={`${textTransitionClass} ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                                        {message}
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                </div>

                <div className="relative mb-6 flex gap-4 text-xs uppercase tracking-[0.4em] text-slate-500">
                    <a className="transition hover:text-slate-200" href="https://www.linkedin.com/in/unnippillil/" rel="noopener noreferrer" target="_blank">
                        LinkedIn
                    </a>
                    <span className="text-slate-600">•</span>
                    <a className="transition hover:text-slate-200" href="https://github.com/Alex-Unnippillil" rel="noopener noreferrer" target="_blank">
                        GitHub
                    </a>
                </div>
            </div>
        </div>
    )
}

export default BootingScreen
