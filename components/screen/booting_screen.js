import React from 'react'
import Image from 'next/image'

const defaultBootMessages = [
    {
        id: 'boot-default-1',
        label: 'Securing environment',
        status: 'pending',
    },
    {
        id: 'boot-default-2',
        label: 'Loading offensive simulations',
        status: 'pending',
    },
    {
        id: 'boot-default-3',
        label: 'Calibrating desktop widgets',
        status: 'pending',
    },
]

function BootingScreen(props) {
    const isVisible = props.visible || props.isShutDown
    const steps = props.progressSteps && props.progressSteps.length > 0 ? props.progressSteps : defaultBootMessages
    const completedSteps = steps.filter((step) => step.status === 'complete')
    const latestAnnouncement = completedSteps.length > 0 ? completedSteps[completedSteps.length - 1]?.label : undefined

    return (
        <div
            role="status"
            aria-live="polite"
            aria-busy={props.visible}
            style={{
                ...(isVisible ? { zIndex: '100' } : { zIndex: '-20' }),
                contentVisibility: 'auto',
            }}
            className={`${isVisible ? 'visible opacity-100' : 'invisible opacity-0'} absolute inset-0 select-none overflow-hidden transition-opacity duration-700`}
        >
            <div className="relative flex h-full w-full flex-col items-center justify-center gap-12 bg-[#030712] text-slate-100">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#030712] to-black" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_58%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(15,118,110,0.18),_transparent_60%)]" />
                </div>

                <div className="relative flex flex-col items-center gap-6 px-6 text-center">
                    <span className="text-xs uppercase tracking-[0.5em] text-slate-400">Initializing workspace</span>
                    <div className="relative">
                        <div className="absolute -inset-6 rounded-full bg-sky-500/20 blur-3xl" aria-hidden />
                        <Image
                            width={360}
                            height={360}
                            className="w-48 md:w-64"
                            src="/themes/Yaru/status/icons8-kali-linux.svg"
                            alt="Kali Linux dragon emblem"
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
                        className={`group relative flex h-20 w-20 items-center justify-center rounded-full border border-slate-700/40 transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${props.isShutDown ? 'cursor-pointer hover:scale-105 hover:border-sky-400/60' : 'cursor-default opacity-80'}`}
                        aria-label={props.isShutDown ? 'Start Kali desktop' : 'Booting Kali desktop'}
                    >
                        {props.isShutDown ? (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-900 transition group-hover:bg-white">
                                <Image width={32} height={32} src="/themes/Yaru/status/power-button.svg" alt="Power button" sizes="32px" priority />
                            </div>
                        ) : (
                            <div className="relative flex h-14 w-14 items-center justify-center">
                                <div className="absolute inset-0 rounded-full border border-slate-700/40" />
                                <div className="absolute inset-0 rounded-full border-4 border-sky-400/80 border-t-transparent border-l-transparent animate-[spin_2.6s_linear_infinite]" />
                                <div className="absolute inset-[30%] rounded-full bg-slate-900" />
                            </div>
                        )}
                    </button>

                    <div className="flex flex-col gap-2 text-sm text-slate-300" aria-live="polite">
                        {latestAnnouncement ? <span className="sr-only">{latestAnnouncement}</span> : null}
                        <ul className="flex flex-col gap-2 text-sm text-slate-300">
                            {steps.map((step) => {
                                const isComplete = step.status === 'complete'
                                return (
                                    <li key={step.id} className="flex items-center gap-3">
                                        <span
                                            className={`inline-flex h-3 w-3 items-center justify-center rounded-full border border-sky-400/70 transition ${
                                                isComplete
                                                    ? 'bg-sky-400/80 text-slate-900'
                                                    : 'border-dashed border-sky-400/40 text-slate-400'
                                            }`}
                                            aria-hidden
                                        >
                                            {isComplete ? (
                                                <svg viewBox="0 0 20 20" className="h-2.5 w-2.5" focusable="false" aria-hidden>
                                                    <path
                                                        d="M5 10.5l3 3 7-7"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            ) : null}
                                        </span>
                                        <span className={isComplete ? 'text-slate-100' : 'text-slate-400'}>{step.label}</span>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>
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
