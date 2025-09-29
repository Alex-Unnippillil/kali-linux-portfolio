import React from 'react'
import Image from 'next/image'

const bootMessages = [
    'Securing environment',
    'Loading offensive simulations',
    'Calibrating desktop widgets',
]

function BootingScreen(props) {
    const isVisible = props.visible || props.isShutDown
    const hasProgress = typeof props.progress === 'number' && !Number.isNaN(props.progress)
    const clampedProgress = hasProgress ? Math.min(100, Math.max(0, props.progress)) : undefined
    const statusDescription = props.statusMessage || 'Booting Kali desktop'
    const progressAnnouncement = hasProgress
        ? `${statusDescription} (${Math.round(clampedProgress)}% complete)`
        : statusDescription
    const accessibilityRoleProps = hasProgress
        ? {
                role: 'progressbar',
                'aria-valuemin': 0,
                'aria-valuemax': 100,
                'aria-valuenow': clampedProgress,
                'aria-valuetext': progressAnnouncement,
          }
        : {
                role: 'status',
                'aria-live': 'polite',
          }

    return (
        <div
            {...accessibilityRoleProps}
            aria-busy={props.visible}
            style={{
                ...(isVisible ? { zIndex: '100' } : { zIndex: '-20' }),
                contentVisibility: 'auto',
            }}
            className={`${
                isVisible ? 'visible opacity-100' : 'invisible opacity-0'
            } absolute inset-0 select-none overflow-hidden motion-safe:transition-opacity motion-safe:duration-700 motion-reduce:transition-none`}
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
                        className={`group relative flex h-20 w-20 items-center justify-center rounded-full border border-slate-700/40 motion-safe:transition motion-safe:duration-300 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${props.isShutDown ? 'cursor-pointer hover:scale-105 hover:border-sky-400/60' : 'cursor-default opacity-80'}`}
                        aria-label={props.isShutDown ? 'Start Kali desktop' : 'Booting Kali desktop'}
                    >
                        {props.isShutDown ? (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-900 motion-safe:transition motion-reduce:transition-none group-hover:bg-white">
                                <Image width={32} height={32} src="/themes/Yaru/status/power-button.svg" alt="Power button" sizes="32px" priority />
                            </div>
                        ) : (
                            <div className="relative flex h-14 w-14 items-center justify-center">
                                <div className="absolute inset-0 rounded-full border border-slate-700/40" />
                                <div className="absolute inset-0 rounded-full border-4 border-sky-400/80 border-t-transparent border-l-transparent motion-safe:animate-[spin_2.6s_linear_infinite] motion-reduce:animate-none" />
                                <div className="absolute inset-[30%] rounded-full bg-slate-900" />
                            </div>
                        )}
                    </button>

                    <div className="text-center text-sm text-slate-300" aria-live={hasProgress ? undefined : 'polite'}>
                        <span className="sr-only">{progressAnnouncement}</span>
                        {hasProgress ? (
                            <span aria-hidden>{Math.round(clampedProgress)}% complete</span>
                        ) : (
                            <span aria-hidden>{statusDescription}</span>
                        )}
                    </div>

                    {hasProgress ? (
                        <div className="flex w-48 flex-col items-center gap-2" aria-hidden>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/60">
                                <div
                                    className="h-full bg-sky-400/80 motion-safe:transition-[width] motion-safe:duration-500 motion-reduce:transition-none"
                                    style={{ width: `${clampedProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : null}

                    <ul className="flex flex-col gap-2 text-sm text-slate-300">
                        {bootMessages.map((message) => (
                            <li key={message} className="flex items-center gap-3">
                                <span className="inline-flex h-2 w-2 rounded-full bg-sky-400/70 shadow-[0_0_12px_rgba(56,189,248,0.7)] motion-safe:animate-[pulse_2s_ease-in-out_infinite] motion-reduce:animate-none" aria-hidden />
                                <span>{message}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative mb-6 flex gap-4 text-xs uppercase tracking-[0.4em] text-slate-500">
                    <a className="motion-safe:transition motion-reduce:transition-none hover:text-slate-200" href="https://www.linkedin.com/in/unnippillil/" rel="noopener noreferrer" target="_blank">
                        LinkedIn
                    </a>
                    <span className="text-slate-600">•</span>
                    <a className="motion-safe:transition motion-reduce:transition-none hover:text-slate-200" href="https://github.com/Alex-Unnippillil" rel="noopener noreferrer" target="_blank">
                        GitHub
                    </a>
                </div>
            </div>
        </div>
    )
}

export default BootingScreen
