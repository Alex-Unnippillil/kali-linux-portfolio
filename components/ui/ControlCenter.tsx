"use client";

import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import Image from 'next/image';
import jsQR from 'jsqr';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';
import { isDarkTheme } from '../../utils/theme';

interface ControlCenterProps {
    className?: string;
    isOpen?: boolean;
    onToggle?: () => void;
}

const ControlCenter = ({ className = "", isOpen, onToggle }: ControlCenterProps) => {
    const [internalOpen, setInternalOpen] = useState(false);

    // Determine if we are in controlled mode
    const isControlled = typeof isOpen === 'boolean';
    const open = isControlled ? isOpen : internalOpen;

    const setOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
        if (isControlled) {
            const newValue = typeof value === 'function' ? value(open) : value;
            if (newValue !== open && onToggle) {
                onToggle();
            }
        } else {
            setInternalOpen(value);
        }
    }, [isControlled, open, onToggle]);
    const rootRef = useRef<HTMLDivElement>(null);
    const { theme, setTheme } = useTheme();
    const { fontScale, setFontScale, volume, setVolume } = useSettings();
    const isDarkMode = isDarkTheme(theme);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);



    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // QR Scanner State
    const [scanning, setScanning] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scanResult, setScanResult] = useState<string | null>(null);

    // Close logic
    useEffect(() => {
        if (!open) {
            setScanning(false);
            setScanResult(null);
            return undefined;
        }

        const handlePointerDown = (event: PointerEvent) => {
            if (!rootRef.current) return;
            if (!rootRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    // QR Scanner Logic
    const startScan = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast("Camera not supported", "error");
            return;
        }

        setScanning(true);
        setScanResult(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                requestAnimationFrame(tick);
            }
        } catch (err) {
            console.error("Camera access denied", err);
            setScanning(false);
            showToast("Camera access denied", "error");
        }
    }, [showToast]);

    const stopScan = useCallback(() => {
        setScanning(false);
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    const tick = () => {
        if (!videoRef.current || !canvasRef.current || !scanning) return;
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (!context) return;

            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

            if (code) {
                setScanResult(code.data);
                stopScan();
                // Optional: Open URL if valid
                if (code.data.startsWith('http')) {
                    showToast("URL Detected", "success");
                }
            }
        }
        if (scanning) requestAnimationFrame(tick);
    };

    useEffect(() => {
        if (!scanning) stopScan();
    }, [scanning, stopScan]);

    const handleToggle = (event: React.MouseEvent) => {
        event.stopPropagation();
        setOpen(prev => !prev);
    }

    const handleCast = () => {
        showToast("Searching for devices...", "info");
    };

    const handleScreenRec = () => {
        setOpen(false);
        // Dispatch open-app event which is handled by desktop.js to open applications
        window.dispatchEvent(new CustomEvent('open-app', { detail: 'screen-recorder' }));
    };

    const handleShare = async () => {
        const shareData = {
            title: document.title,
            url: window.location.href
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error(err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(window.location.href);
                showToast("Link copied to clipboard", "success");
            } catch (err) {
                showToast("Failed to copy link", "error");
            }
        }
    };

    if (!mounted) return null;

    return (
        <div ref={rootRef} className={`relative flex items-center ${className}`.trim()}>
            <button
                type="button"
                className="flex h-full w-full items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                onClick={handleToggle}
                aria-label="Control Center"
                aria-expanded={open}
                title="Control Center"
                onPointerDown={(e) => e.stopPropagation()}
            >
                <div className="status-symbol h-4 w-4 relative flex items-center justify-center transition-transform group-hover:scale-105 text-white/90">
                    <SettingsIcon />
                </div>
            </button>

            {open && (
                <div
                    className="absolute top-full right-0 z-[300] mt-3 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Control Center</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setTheme(isDarkMode ? 'default' : 'dark')} className="rounded-full bg-white/5 p-2 hover:bg-white/10 transition-colors" title="Toggle Theme">
                                {isDarkMode ? <MoonIcon /> : <SunIcon />}
                            </button>
                        </div>
                    </div>

                    {/* QR Scanner Area */}
                    {scanning ? (
                        <div className="mb-4 relative rounded-xl overflow-hidden aspect-video bg-black max-h-[40vh]">
                            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                            <canvas ref={canvasRef} className="hidden" />
                            <button onClick={stopScan} className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white hover:bg-black/70 transition-colors">
                                <CloseIcon />
                            </button>
                            <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/80 bg-black/40 py-1">Scanning...</div>
                        </div>
                    ) : scanResult ? (
                        <div className="mb-4 p-3 rounded-xl bg-white/10 break-all">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-[10px] text-slate-400 uppercase font-bold">Scan Result</div>
                                <button onClick={() => setScanResult(null)} className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white">
                                    <CloseIcon />
                                </button>
                            </div>
                            <div className="text-sm mb-3 font-mono bg-black/20 p-2 rounded border border-white/5 selection:bg-cyan-500/30 selection:text-cyan-100">{scanResult}</div>
                            <div className="flex gap-2">
                                {scanResult.startsWith('http') && (
                                    <a href={scanResult} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold hover:bg-cyan-500/30 transition-colors border border-cyan-500/30">
                                        Open Link
                                    </a>
                                )}
                                <button onClick={() => {
                                    navigator.clipboard.writeText(scanResult);
                                    showToast("Copied", "success");
                                }} className="flex-1 px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors border border-white/10">
                                    Copy
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {/* Toast Notification */}
                    {toast && (
                        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[400] w-max max-w-[90%] pointer-events-none">
                            <div className={`px-4 py-2 rounded-xl shadow-xl border backdrop-blur-md text-xs font-bold animate-in fade-in slide-in-from-top-2 flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500/90 border-red-400/50 text-white shadow-red-900/20' :
                                toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400/50 text-white shadow-emerald-900/20' :
                                    'bg-slate-800/90 border-white/10 text-white shadow-black/40'
                                }`}>
                                {toast.type === 'success' && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                {toast.message}
                            </div>
                        </div>
                    )}

                    {/* Main Grid */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                        <ActionButton icon={<QRIcon />} label="Scan QR" onClick={startScan} active={scanning} />
                        <ActionButton icon={<CastIcon />} label="Cast" onClick={handleCast} />
                        <ActionButton icon={<RecordIcon />} label="Record" onClick={handleScreenRec} />
                        <ActionButton icon={<ShareIcon />} label="Share" onClick={handleShare} />
                    </div>



                    {/* Sliders */}
                    <div className="mb-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex justify-between text-xs mb-2 font-medium">
                            <span className="text-slate-300">Text Size</span>
                            <span className="text-cyan-300">{Math.round(fontScale * 100)}%</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-white/10">
                            <div className="absolute inset-y-0 left-0 bg-cyan-500 rounded-full transition-all duration-100" style={{ width: `${Math.min(100, Math.max(0, (fontScale - 0.5) * 100))}%` }} />
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.1"
                                value={fontScale}
                                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                aria-label="Text Size"
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-medium">
                            <span>A</span>
                            <span>A</span>
                        </div>
                    </div>

                    <div className="mb-2 p-3 rounded-xl bg-white/5 border border-white/5 flex gap-3 items-center">
                        <button
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            onClick={() => setVolume(volume === 0 ? 100 : 0)}
                        >
                            {volume === 0 ? <VolumeXIcon /> : <Volume2Icon />}
                        </button>
                        <div className="flex-1">
                            <div className="flex justify-between text-xs mb-2 font-medium">
                                <span className="text-slate-300">Volume</span>
                                <span className="text-cyan-300">{Math.round(volume)}%</span>
                            </div>
                            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-white/10">
                                <div className="absolute inset-y-0 left-0 bg-cyan-500 rounded-full transition-all duration-100" style={{ width: `${volume}%` }} />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    aria-label="Volume"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ActionButton = ({ icon, label, onClick, active }: { icon: ReactNode, label: string, onClick: () => void, active?: boolean }) => (
    <button
        onClick={onClick}
        className={`group flex flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200 border ${active
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 shadow-[0_0_12px_-4px_rgba(34,211,238,0.4)]'
            : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10 hover:border-white/10 hover:text-white'
            }`}
    >
        <span className={`h-6 w-6 transition-transform group-hover:scale-110 duration-200 ${active ? 'animate-pulse' : ''}`}>{icon}</span>
        <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </button>
);



// Icons
const QRIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M12 12h.01" /></svg>;
const CastIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 16.1A5 5 0 0 1 5.9 20" /><path d="M2 12.05A9 9 0 0 1 9.95 20" /><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" /><line x1="2" y1="20" x2="2.01" y2="20" /></svg>;
const RecordIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /></svg>;
const ShareIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
const Volume2Icon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>;
const VolumeXIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>;

const SunIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>;
const MoonIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>;
const CloseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
const SettingsIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>;

export default ControlCenter;
