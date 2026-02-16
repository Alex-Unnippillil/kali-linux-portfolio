import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useOPFS from '../../hooks/useOPFS';

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
    type SavedRecording = {
        id: string;
        name: string;
        url: string;
        createdAt: string;
        sizeBytes: number;
        persisted: boolean;
    };

    const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'finished'>('idle');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [micEnabled, setMicEnabled] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [supportedMimeType, setSupportedMimeType] = useState<string>('video/webm');
    const [savedRecordings, setSavedRecordings] = useState<SavedRecording[]>([]);
    const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
    const [savedInFilesPath, setSavedInFilesPath] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const sessionUrlRef = useRef<string | null>(null);
    const persistedUrlRef = useRef<string[]>([]);

    const hasMediaRecorder = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
    const hasDisplayMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
    const canRecord = hasMediaRecorder && hasDisplayMedia;

    const { supported: opfsSupported, getDir, listFiles, writeFile, deleteFile } = useOPFS();

    // Check for MP4 support on mount
    useEffect(() => {
        if (!hasMediaRecorder) {
            setSupportedMimeType('video/webm');
            return;
        }
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
    }, [hasMediaRecorder]);

    const formatDateStamp = (date: Date) => {
        const pad = (value: number) => String(value).padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    };

    const formatSize = (sizeBytes: number) => {
        if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
        return `${(sizeBytes / 1024).toFixed(1)} KB`;
    };

    const buildRecordingName = () => {
        const ext = supportedMimeType.includes('mp4') ? 'mp4' : 'webm';
        const stamp = formatDateStamp(new Date());
        return `screen-recording-${stamp}.${ext}`;
    };

    const loadSavedRecordings = React.useCallback(async () => {
        if (!opfsSupported) {
            setSavedRecordings([]);
            return;
        }

        const dir = await getDir('Media/Screen Recorder', { create: true });
        if (!dir) return;

        persistedUrlRef.current.forEach((url) => URL.revokeObjectURL(url));
        persistedUrlRef.current = [];

        const handles = await listFiles(dir);
        const files = await Promise.all(handles.map(async (handle) => {
            const file = await handle.getFile();
            const url = URL.createObjectURL(file);
            persistedUrlRef.current.push(url);
            return {
                id: `persisted-${file.name}`,
                name: file.name,
                url,
                createdAt: new Date(file.lastModified).toISOString(),
                sizeBytes: file.size,
                persisted: true,
            };
        }));

        files.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setSavedRecordings(files);
    }, [getDir, listFiles, opfsSupported]);

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

    useEffect(() => {
        void loadSavedRecordings();
    }, [loadSavedRecordings]);

    const startRecording = async () => {
        if (!canRecord) {
            setError('Screen recording is not supported in this browser.');
            return;
        }
        setError(null);
        setSavedInFilesPath(null);
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
                setRecordingBlob(blob);
                if (sessionUrlRef.current) {
                    URL.revokeObjectURL(sessionUrlRef.current);
                }
                const url = URL.createObjectURL(blob);
                sessionUrlRef.current = url;
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

    const saveBlobExternally = async (blob: Blob, filename: string, fallbackUrl?: string | null) => {
        const isMp4 = filename.toLowerCase().endsWith('.mp4');
        const mimeRoot = isMp4 ? 'video/mp4' : 'video/webm';
        try {
            if ('showSaveFilePicker' in window) {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: isMp4 ? 'MP4 Video' : 'WebM Video',
                        accept: { [mimeRoot]: ['.' + (isMp4 ? 'mp4' : 'webm')] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            }
            throw new Error('File System Access API not supported');
        } catch (err: any) {
            if (err.name === 'AbortError') {
                return;
            }
            const downloadUrl = fallbackUrl || URL.createObjectURL(blob);
            const shouldRevoke = !fallbackUrl;
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                if (shouldRevoke) URL.revokeObjectURL(downloadUrl);
            }, 100);
        }
    };

    const saveRecording = async () => {
        if (!recordingBlob) return;
        setSavedInFilesPath(null);
        setError(null);

        const filename = buildRecordingName();

        if (!opfsSupported) {
            await saveBlobExternally(recordingBlob, filename, sessionUrlRef.current);
            return;
        }

        try {
            const dir = await getDir('Media/Screen Recorder', { create: true });
            if (!dir) throw new Error('Could not access Files directory.');
            const wrote = await writeFile(filename, recordingBlob, dir);
            if (!wrote) throw new Error('Could not write recording to Files.');

            const savedPath = `Media/Screen Recorder/${filename}`;
            setSavedInFilesPath(savedPath);
            window.dispatchEvent(new CustomEvent('system-notification', {
                detail: {
                    appId: 'screen-recorder',
                    title: 'Recording saved',
                    body: `Saved to Files: ${savedPath}`,
                    priority: 'normal',
                },
            }));
            await loadSavedRecordings();
            return;
        } catch (err) {
            console.warn('OPFS save failed, falling back to external save.', err);
            setError('Save to Files failed. Downloading externally instead.');
            await saveBlobExternally(recordingBlob, filename, sessionUrlRef.current);
        }
    };

    const openInFiles = () => {
        window.dispatchEvent(new CustomEvent('open-app', { detail: { id: 'files', path: 'Media/Screen Recorder' } }));
    };

    const playSavedRecording = (recording: SavedRecording) => {
        setVideoUrl(recording.url);
        setStatus('finished');
        setSavedInFilesPath(`Media/Screen Recorder/${recording.name}`);
        setRecordingBlob(null);
    };

    const downloadSavedRecording = (recording: SavedRecording) => {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = recording.url;
        a.download = recording.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 100);
    };

    const deleteSavedRecording = async (recording: SavedRecording) => {
        if (!opfsSupported) return;
        const dir = await getDir('Media/Screen Recorder', { create: true });
        if (!dir) return;
        await deleteFile(recording.name, dir);
        if (savedInFilesPath?.endsWith(recording.name)) {
            setSavedInFilesPath(null);
        }
        await loadSavedRecordings();
    };

    const renderRecentRecordings = () => {
        if (!opfsSupported) return null;
        return (
            <div className="w-full max-w-3xl rounded-xl border border-white/10 bg-black/30 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-200">Recent Recordings</h3>
                    <button
                        onClick={openInFiles}
                        className="text-xs text-blue-300 hover:text-blue-200 transition-colors"
                    >
                        Open in Files
                    </button>
                </div>
                {savedRecordings.length === 0 ? (
                    <p className="text-xs text-gray-400">No saved recordings yet. Use Save to Files after recording.</p>
                ) : (
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                        {savedRecordings.map((recording) => (
                            <div key={recording.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
                                <div className="min-w-0">
                                    <p className="text-sm text-gray-100 truncate">{recording.name}</p>
                                    <p className="text-xs text-gray-400">
                                        {new Date(recording.createdAt).toLocaleString()} · {formatSize(recording.sizeBytes)}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button aria-label={`Play ${recording.name}`} onClick={() => playSavedRecording(recording)} className="px-2 py-1 text-xs rounded-md bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30">Play</button>
                                    <button aria-label={`Download ${recording.name}`} onClick={() => downloadSavedRecording(recording)} className="px-2 py-1 text-xs rounded-md bg-blue-600/20 text-blue-300 hover:bg-blue-600/30">Download</button>
                                    <button aria-label={`Delete ${recording.name}`} onClick={() => void deleteSavedRecording(recording)} className="px-2 py-1 text-xs rounded-md bg-red-600/20 text-red-300 hover:bg-red-600/30">Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const reset = () => {
        if (sessionUrlRef.current && videoUrl === sessionUrlRef.current) {
            URL.revokeObjectURL(sessionUrlRef.current);
            sessionUrlRef.current = null;
        }
        setVideoUrl(null);
        setTimer(0);
        setStatus('idle');
        setError(null);
        setRecordingBlob(null);
        setSavedInFilesPath(null);
        chunksRef.current = [];
    };

    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                recorderRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
            if (sessionUrlRef.current) {
                URL.revokeObjectURL(sessionUrlRef.current);
                sessionUrlRef.current = null;
            }
            persistedUrlRef.current.forEach((url) => URL.revokeObjectURL(url));
            persistedUrlRef.current = [];
        };
    }, []);

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
                                disabled={!canRecord}
                                className="group relative flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-medium shadow-lg shadow-red-900/20 transition-all"
                            >
                                <RecordIcon />
                                <span>Start Recording</span>
                                <div className="absolute inset-0 rounded-full border border-white/20" />
                            </motion.button>

                            {!canRecord && <p className="text-yellow-400 text-xs max-w-xs text-center">Screen Recorder is unavailable in this browser (missing MediaRecorder or getDisplayMedia).</p>}

                            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

                            {renderRecentRecordings()}
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
                                <video src={videoUrl} controls playsInline aria-label="Recorded screen preview" className="w-full h-full object-contain" />
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
                                    {opfsSupported ? 'Save to Files' : `Save as ${supportedMimeType.includes('mp4') ? 'MP4' : 'WebM'}`}
                                </motion.button>

                                {savedInFilesPath && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={openInFiles}
                                        className="px-6 py-3 rounded-lg text-blue-300 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Open in Files
                                    </motion.button>
                                )}
                            </div>

                            {renderRecentRecordings()}
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
