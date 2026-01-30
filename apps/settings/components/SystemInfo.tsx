import React, { useEffect, useState } from 'react';

const InfoCard = ({ label, value, detailed = false }: { label: string, value: string, detailed?: boolean }) => (
    <div className={`p-4 rounded-xl bg-[var(--kali-panel-border)]/10 border border-[var(--kali-panel-border)]/20 hover:bg-[var(--kali-panel-border)]/20 transition-colors ${detailed ? 'md:col-span-2' : ''}`}>
        <div className="text-xs uppercase tracking-wider opacity-60 font-semibold text-[var(--kali-primary)]">{label}</div>
        <div className="mt-1 text-sm font-mono break-words text-[var(--color-text)]">{value}</div>
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
            <section className="rounded-2xl border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/40 backdrop-blur-md overflow-hidden transition-all hover:bg-[var(--kali-panel)]/60 hover:shadow-lg">
                <div className="px-6 py-5 border-b border-[var(--kali-panel-border)]/50">
                    <h2 className="text-base font-medium text-[var(--color-text)]">System Specifications</h2>
                </div>
                <div className="p-6">
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

            <section className="rounded-2xl border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/40 backdrop-blur-md overflow-hidden transition-all hover:bg-[var(--kali-panel)]/60 hover:shadow-lg">
                <div className="px-6 py-5 border-b border-[var(--kali-panel-border)]/50">
                    <h2 className="text-base font-medium text-[var(--color-text)]">Credits & Licenses</h2>
                </div>
                <div className="p-6">
                    <div className="space-y-4 text-sm text-[var(--color-text)]/80 leading-relaxed">
                        <p>
                            This project is a personal portfolio designed to emulate the Kali Linux desktop experience on the web.
                            Built with modern web technologies including React, Next.js, Tailwind CSS, and Framer Motion.
                        </p>
                        <div className="grid gap-2 text-xs opacity-70">
                            <div>Icons provided by FontAwesome & Lucide (simulated)</div>
                            <div>Wallpapers sourced from Kali Linux community assets or generated</div>
                        </div>
                        <div className="pt-4">
                            <span className="inline-flex items-center rounded-full bg-[var(--kali-control)]/10 px-3 py-1 text-xs font-medium text-[var(--kali-control)] border border-[var(--kali-control)]/20">
                                MIT License
                            </span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
