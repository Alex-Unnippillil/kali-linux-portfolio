import React from 'react'
import Image from 'next/image'

function BootingScreen(props) {
    const isVisible = props.visible || props.isShutDown

    return (
        <div
            style={{
                ...(isVisible ? { zIndex: '100' } : { zIndex: '-20' }),
                contentVisibility: 'auto',
            }}
            className={(isVisible ? ' visible opacity-100' : ' invisible opacity-0') + ' absolute duration-500 select-none flex flex-col items-center justify-between top-0 right-0 overflow-hidden m-0 h-screen w-screen bg-black'}
        >
            <div className="flex-1 flex flex-col items-center justify-center gap-8 md:gap-10 px-4 text-center">
                <Image
                    width={320}
                    height={320}
                    className="w-36 md:w-48 drop-shadow-[0_0_35px_rgba(23,147,209,0.6)]"
                    src="/themes/Kali/panel/emblem-system-symbolic.svg"
                    alt="Kali Linux dragon emblem"
                    sizes="(max-width: 768px) 40vw, 20vw"
                    priority
                />
                <div className="flex flex-col items-center gap-4">
                    <Image
                        width={420}
                        height={160}
                        className="w-56 md:w-72"
                        src="/themes/Kali/panel/kali-wordmark.svg"
                        alt="Kali Linux wordmark"
                        sizes="(max-width: 768px) 65vw, 30vw"
                        priority
                    />
                    <p className="text-sky-200/80 uppercase tracking-[0.35em] text-[0.55rem] md:text-xs">
                        The quieter you become, the more you are able to hear.
                    </p>
                </div>
                <div
                    className="w-12 h-12 flex justify-center items-center rounded-full outline-none cursor-pointer transition hover:bg-slate-800/40"
                    onClick={props.turnOn}
                >
                    {props.isShutDown ? (
                        <div className="bg-white/10 border border-sky-500/50 rounded-full flex justify-center items-center w-12 h-12 hover:bg-slate-800/50">
                            <Image
                                width={36}
                                height={36}
                                className="w-8 md:w-9"
                                src="/themes/Kali/panel/power-button.svg"
                                alt="Power button"
                                sizes="36px"
                                priority
                            />
                        </div>
                    ) : (
                        <Image
                            width={44}
                            height={44}
                            className={(props.visible ? 'animate-spin ' : '') + 'w-10 md:w-11'}
                            src="/themes/Kali/panel/process-working-symbolic.svg"
                            alt="Boot progress spinner"
                            sizes="44px"
                            priority
                        />
                    )}
                </div>
            </div>
            <div className="text-slate-300 mb-6 text-sm">
                <a className="underline decoration-sky-500/60 decoration-2 underline-offset-4" href="https://www.linkedin.com/in/unnippillil/" rel="noopener noreferrer" target="_blank">linkedin</a>
                <span className="font-bold mx-2 text-slate-500">|</span>
                <a href="https://github.com/Alex-Unnippillil" rel="noopener noreferrer" target="_blank" className="underline decoration-sky-500/60 decoration-2 underline-offset-4">github</a>
            </div>
        </div>
    )
}

export default BootingScreen
