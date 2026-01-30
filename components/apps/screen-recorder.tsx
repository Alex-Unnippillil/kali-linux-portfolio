import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Inline SVGs for controls
const RecordIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" fill="currentColor" />
    </svg>
);

const StopIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
);

const PauseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="6" width="4" height="12" rx="1" fill="currentColor" />
        <rect x="13" y="6" width="4" height="12" rx="1" fill="currentColor" />
    </svg>
);

const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5V19L19 12L8 5Z" fill="currentColor" />
    </svg>
);

const DownloadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const MicIcon = ({ enabled }: { enabled: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={enabled ? "text-green-400" : "text-gray-400"}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

function ScreenRecorder() {
    const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'finished'>('idle');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [micEnabled, setMicEnabled] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [supportedMimeType, setSupportedMimeType] = useState<string>('video/webm');

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Check for MP4 support on mount
    useEffect(() => {
        const types = [
            'video/mp4',
            'video/webm;codecs=h264',
            'video/webm;codecs=vp9,opus',
            'video/webm'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                setSupportedMimeType(type);
                break;
            }
        }
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (status === 'recording') {
            timerIntervalRef.current = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [status]);

    const startRecording = async () => {
        setError(null);
        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' } as any,
                audio: true,
            });

            const tracks = [...displayStream.getTracks()];

            if (micEnabled) {
                try {
                    const micStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            sampleRate: 44100
                        }
                    });
                    tracks.push(...micStream.getAudioTracks());
                } catch (err) {
                    console.warn("Could not get microphone stream:", err);
                    setError("Microphone access denied. Recording system audio only.");
                }
            }

            const combinedStream = new MediaStream(tracks);
            streamRef.current = combinedStream;

            combinedStream.getVideoTracks()[0].onended = () => {
                stopRecording();
            };

            const recorder = new MediaRecorder(combinedStream, {
                mimeType: supportedMimeType,
                videoBitsPerSecond: 5000000 // 5 Mbps for better quality
            });

            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: supportedMimeType });
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                combinedStream.getTracks().forEach((t) => t.stop());
                setStatus('finished');
            };

            recorder.start(1000);
            recorderRef.current = recorder;
            setStatus('recording');
        } catch (err) {
            console.error("Error starting recording:", err);
            setStatus('idle');
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                // User cancelled
            } else {
                setError("Failed to start recording. Please try again.");
            }
        }
    };

    const pauseRecording = () => {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.pause();
            setStatus('paused');
        }
    };

    const resumeRecording = () => {
        if (recorderRef.current && recorderRef.current.state === 'paused') {
            recorderRef.current.resume();
            setStatus('recording');
        }
    };

    const stopRecording = () => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
    };

    const saveRecording = async () => {
        if (!videoUrl || chunksRef.current.length === 0) return;

        const blob = new Blob(chunksRef.current, { type: supportedMimeType });
        // Determine extension
        const isMp4 = supportedMimeType.includes('mp4');
        const ext = isMp4 ? 'mp4' : 'webm';
        const filename = `screen-recording-${new Date().toISOString().slice(0, 10)}.${ext}`;

        try {
            if ('showSaveFilePicker' in window) {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: isMp4 ? 'MP4 Video' : 'WebM Video',
                        accept: { [supportedMimeType.split(';')[0]]: ['.' + ext] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            } else {
                throw new Error("File System Access API not supported");
            }
        } catch (err: any) {
            // If user cancelled the dialog, we might want to respect that?
            // But to be safe and ensure "User can save", we fallback unless it's an explicit AbortError
            if (err.name === 'AbortError') {
                console.log("Save cancelled by user.");
                return;
            }

            console.warn("Save failed with File System Access API, falling back to download link.", err);

            // Robust Fallback
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = videoUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
            }, 100);
        }
    };

    const reset = () => {
        setVideoUrl(null);
        setTimer(0);
        setStatus('idle');
        setError(null);
        chunksRef.current = [];
    };

    return (
        <div className="h-full w-full flex flex-col font-sans bg-gray-900 text-white overflow-hidden relative select-none">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0" />
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(200, 50, 200, 0.1) 0%, transparent 50%)'
            }} />

            {/* Header */}
            <div className="relative z-10 w-full p-4 flex justify-between items-center border-b border-white/10 bg-white/5 backdrop-blur-md">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse hidden" style={{ display: status === 'recording' ? 'block' : 'none' }} />
                    <h1 className="text-lg font-medium tracking-wide">Screen Recorder</h1>
                </div>
                <div className="flex items-center gap-4 text-sm font-mono text-gray-300 bg-black/40 px-3 py-1 rounded-full border border-white/10">
                    {formatTime(timer)}
                </div>
            </div>

            {/* Main Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 gap-8">
                <AnimatePresence mode="wait">
                    {status === 'idle' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center gap-6"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-light text-gray-200">Ready to Capture</h2>
                                <p className="text-gray-400 text-sm max-w-xs">Record your screen, windows, or specific tabs with system audio.</p>
                                <p className="text-gray-500 text-xs mt-2 font-mono">Format: {supportedMimeType.includes('mp4') ? 'MP4' : 'WebM'}</p>
                            </div>

                            <div className="flex items-center gap-4 bg-black/30 p-2 rounded-2xl border border-white/10">
                                <button
                                    onClick={() => setMicEnabled(!micEnabled)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all duration-200 ${micEnabled ? 'bg-white/10 text-green-400' : 'hover:bg-white/5 text-gray-400'}`}
                                >
                                    <MicIcon enabled={micEnabled} />
                                    {micEnabled ? "Microphone On" : "Microphone Off"}
                                </button>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startRecording}
                                className="group relative flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-medium shadow-lg shadow-red-900/20 transition-all"
                            >
                                <RecordIcon />
                                <span>Start Recording</span>
                                <div className="absolute inset-0 rounded-full border border-white/20" />
                            </motion.button>

                            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                        </motion.div>
                    )}

                    {(status === 'recording' || status === 'paused') && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="flex flex-col items-center gap-8"
                        >
                            <div className="relative w-48 h-48 flex items-center justify-center">
                                <motion.div
                                    animate={status === 'recording' ? { scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] } : {}}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 bg-red-500 rounded-full blur-xl"
                                />
                                <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-gray-800 to-black rounded-full border border-white/10 flex items-center justify-center shadow-2xl">
                                    <div className={`w-4 h-4 rounded-sm ${status === 'recording' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                    <span className="absolute -bottom-8 text-sm text-gray-400 tracking-widest font-mono">
                                        {status === 'recording' ? 'RECORDING' : 'PAUSED'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {status === 'recording' ? (
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={pauseRecording}
                                        className="p-4 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 rounded-full border border-yellow-500/30 transition-colors"
                                        title="Pause"
                                    >
                                        <PauseIcon />
                                    </motion.button>
                                ) : (
                                    <motion.button
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={resumeRecording}
                                        className="p-4 bg-green-600/20 text-green-500 hover:bg-green-600/30 rounded-full border border-green-500/30 transition-colors"
                                        title="Resume"
                                    >
                                        <PlayIcon />
                                    </motion.button>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={stopRecording}
                                    className="p-6 bg-red-600/20 text-red-500 hover:bg-red-600/30 rounded-full border border-red-500/30 transition-colors"
                                    title="Stop"
                                >
                                    <StopIcon />
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {status === 'finished' && videoUrl && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full h-full flex flex-col items-center gap-4 overflow-hidden"
                        >
                            <div className="flex-1 w-full min-h-0 bg-black rounded-xl overflow-hidden border border-white/20 shadow-2xl flex items-center justify-center">
                                <video src={videoUrl} controls playsInline className="w-full h-full object-contain" />
                            </div>

                            <div className="flex items-center gap-4 py-2 shrink-0">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={reset}
                                    className="px-6 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Discard
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={saveRecording}
                                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/20"
                                >
                                    <DownloadIcon />
                                    Save as {supportedMimeType.includes('mp4') ? 'MP4' : 'WebM'}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};
