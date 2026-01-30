import React, { useEffect, useState } from 'react';

const InfoCard = ({ label, value, detailed = false }: { label: string, value: string, detailed?: boolean }) => (
    <div className={`p-4 rounded-lg bg-[var(--kali-panel)]/50 border border-[var(--kali-panel-border)] hover:bg-[var(--kali-panel-border)]/20 transition-colors ${detailed ? 'md:col-span-2' : ''}`}>
        <div className="text-xs uppercase tracking-wider opacity-60 font-semibold text-[var(--kali-primary)]">{label}</div>
        <div className="text-base font-mono mt-2 break-words text-[var(--color-text)]">{value}</div>
    </div>
);

export default function SystemInfo() {
    const [screenInfo, setScreenInfo] = useState('Unknown');
    const [browserInfo, setBrowserInfo] = useState('Unknown');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setScreenInfo(`${window.screen.width} x ${window.screen.height}`);
            setBrowserInfo(window.navigator.userAgent);
        }
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <section className="rounded-2xl border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/80 shadow-kali-panel backdrop-blur-sm">
                <header className="border-b border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/90 px-5 py-4">
                    <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--color-text)]/70">
                        System Specifications
                    </h2>
                </header>
                <div className="px-5 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoCard label="OS Version" value="Kali Portfolio v2.1.0" />
                        <InfoCard label="Kernel" value="Web-Kernel 5.15 (Emulated)" />
                        <InfoCard label="Environment" value="React 19 / Next.js 15" />
                        <InfoCard label="Memory" value="Virtual 16GB RAM" />
                        <InfoCard label="Display Resolution" value={screenInfo} />
                        <InfoCard label="User Agent" value={browserInfo} detailed />
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/80 shadow-kali-panel backdrop-blur-sm">
                <header className="border-b border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/90 px-5 py-4">
                    <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--color-text)]/70">
                        Credits & Licenses
                    </h2>
                </header>
                <div className="px-5 py-4">
                    <div className="space-y-4 text-sm text-[var(--color-text)]/80 leading-relaxed">
                        <p>
                            This project is a personal portfolio designed to emulate the Kali Linux desktop experience on the web.
                            Built with modern web technologies including React, Next.js, Tailwind CSS, and Framer Motion.
                        </p>
                        <div className="grid gap-2 text-xs opacity-70">
                            <div>Icons provided by FontAwesome & Lucide (simulated)</div>
                            <div>Wallpapers sourced from Kali Linux community assets or generated</div>
                        </div>
                        <div className="pt-2">
                            <span className="inline-flex items-center rounded-full bg-[var(--kali-control)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--kali-control)]">
                                MIT License
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
