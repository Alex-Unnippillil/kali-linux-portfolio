import React, { useCallback, useEffect, useRef, useState } from 'react';
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

type SavedRecording = {
    id: string;
    name: string;
    url: string;
    createdAt: string;
    sizeBytes: number;
    persisted: boolean;
};

const formatDateStamp = (date: Date) => {
    const pad = (v: number) => String(v).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

function ScreenRecorder() {
    const [status, setStatus] = useState<'idle' | 'recording' | 'paused' | 'finished'>('idle');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [micEnabled, setMicEnabled] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [supportedMimeType, setSupportedMimeType] = useState<string>('video/webm');
    const [savedRecordings, setSavedRecordings] = useState<SavedRecording[]>([]);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [openInFilesVisible, setOpenInFilesVisible] = useState(false);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentBlobRef = useRef<Blob | null>(null);
    const sessionUrlRef = useRef<string | null>(null);
    const persistedUrlsRef = useRef<string[]>([]);

    const hasDisplayMedia = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
    const hasMediaRecorder = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';

    const { supported: opfsSupported, getDir, listFiles, writeFile, deleteFile } = useOPFS();

    // Check for MP4 support on mount.
    useEffect(() => {
        if (!hasMediaRecorder) return;
        const types = ['video/mp4', 'video/webm;codecs=h264', 'video/webm;codecs=vp9,opus', 'video/webm'];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                setSupportedMimeType(type);
                break;
            }
        }
    }, [hasMediaRecorder]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const stopActiveMedia = useCallback(() => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const cleanupSessionUrl = useCallback(() => {
        if (sessionUrlRef.current) {
            URL.revokeObjectURL(sessionUrlRef.current);
            sessionUrlRef.current = null;
        }
    }, []);

    const downloadBlobExternally = useCallback(async (blob: Blob, filename: string) => {
        const isMp4 = blob.type.includes('mp4') || /\.mp4$/i.test(filename);
        try {
            if ('showSaveFilePicker' in window) {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: isMp4 ? 'MP4 Video' : 'WebM Video',
                        accept: { [blob.type.split(';')[0] || (isMp4 ? 'video/mp4' : 'video/webm')]: ['.' + (isMp4 ? 'mp4' : 'webm')] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            }
            throw new Error('File System Access API not supported');
        } catch (err: any) {
            if (err?.name === 'AbortError') return;
            const tempUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = tempUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(tempUrl);
            }, 100);
        }
    }, []);

    const loadPersistedRecordings = useCallback(async () => {
        if (!opfsSupported) {
            persistedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            persistedUrlsRef.current = [];
            setSavedRecordings([]);
            return;
        }

        const dir = await getDir('Media/Screen Recorder', { create: true });
        if (!dir) return;

        persistedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        persistedUrlsRef.current = [];

        const handles = await listFiles(dir);
        const files = await Promise.all(
            handles.map(async (handle) => {
                const file = await handle.getFile();
                const url = URL.createObjectURL(file);
                persistedUrlsRef.current.push(url);
                return {
                    id: `persisted-${file.name}`,
                    name: file.name,
                    url,
                    createdAt: new Date(file.lastModified).toISOString(),
                    sizeBytes: file.size,
                    persisted: true,
                };
            }),
        );

        files.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setSavedRecordings(files);
    }, [getDir, listFiles, opfsSupported]);

    useEffect(() => {
        void loadPersistedRecordings();
    }, [loadPersistedRecordings]);

    useEffect(() => {
        if (status === 'recording') {
            timerIntervalRef.current = setInterval(() => {
                setTimer((prev) => prev + 1);
            }, 1000);
        } else if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
        }

        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [status]);

    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            stopActiveMedia();
            cleanupSessionUrl();
            persistedUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [cleanupSessionUrl, stopActiveMedia]);

    const startRecording = async () => {
        if (!hasDisplayMedia || !hasMediaRecorder) {
            setError('Screen recording APIs are not available in this browser.');
            return;
        }

        setError(null);
        setSaveMessage(null);
        setOpenInFilesVisible(false);

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
                            sampleRate: 44100,
                        },
                    });
                    tracks.push(...micStream.getAudioTracks());
                } catch (err) {
                    console.warn('Could not get microphone stream:', err);
                    setError('Microphone access denied. Recording system audio only.');
                }
            }

            const combinedStream = new MediaStream(tracks);
            streamRef.current = combinedStream;

            const firstVideoTrack = combinedStream.getVideoTracks()[0];
            if (firstVideoTrack) {
                firstVideoTrack.onended = () => {
                    if (recorderRef.current?.state !== 'inactive') {
                        recorderRef.current?.stop();
                    }
                };
            }

            const recorder = new MediaRecorder(combinedStream, {
                mimeType: supportedMimeType,
                videoBitsPerSecond: 5000000,
            });

            chunksRef.current = [];
            currentBlobRef.current = null;

            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: supportedMimeType });
                currentBlobRef.current = blob;
                cleanupSessionUrl();
                const url = URL.createObjectURL(blob);
                sessionUrlRef.current = url;
                setVideoUrl(url);
                combinedStream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                setStatus('finished');
            };

            recorder.start(1000);
            recorderRef.current = recorder;
            setTimer(0);
            setStatus('recording');
        } catch (err) {
            console.error('Error starting recording:', err);
            setStatus('idle');
            if (!(err instanceof DOMException && err.name === 'NotAllowedError')) {
                setError('Failed to start recording. Please try again.');
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

    const getCurrentFilename = () => {
        const isMp4 = supportedMimeType.includes('mp4');
        const ext = isMp4 ? 'mp4' : 'webm';
        return `screen-recording-${formatDateStamp(new Date())}.${ext}`;
    };

    const saveToFiles = async () => {
        if (!currentBlobRef.current) return;

        const filename = getCurrentFilename();
        const blob = currentBlobRef.current;

        if (!opfsSupported) {
            await downloadBlobExternally(blob, filename);
            return;
        }

        setSaveMessage(null);

        try {
            const dir = await getDir('Media/Screen Recorder', { create: true });
            if (!dir) throw new Error('Unable to create Media/Screen Recorder directory');

            const wrote = await writeFile(filename, blob, dir);
            if (!wrote) throw new Error('Failed to write recording to OPFS');

            window.dispatchEvent(new CustomEvent('system-notification', {
                detail: {
                    appId: 'screen-recorder',
                    title: 'Recording saved',
                    body: `Saved to Files: Media/Screen Recorder/${filename}`,
                    priority: 'normal',
                },
            }));

            setSaveMessage(`Saved to Files: Media/Screen Recorder/${filename}`);
            setOpenInFilesVisible(true);
            await loadPersistedRecordings();
        } catch (err) {
            console.warn('Save to Files failed, falling back to external save.', err);
            setSaveMessage('Could not save to Files. Downloaded using browser save instead.');
            await downloadBlobExternally(blob, filename);
        }
    };

    const saveRecordingExternally = async () => {
        if (!currentBlobRef.current) return;
        await downloadBlobExternally(currentBlobRef.current, getCurrentFilename());
    };

    const downloadSavedRecording = async (recording: SavedRecording) => {
        const fileResponse = await fetch(recording.url);
        const blob = await fileResponse.blob();
        await downloadBlobExternally(blob, recording.name);
    };

    const deleteSavedRecording = async (recording: SavedRecording) => {
        if (!recording.persisted) return;
        const dir = await getDir('Media/Screen Recorder', { create: true });
        if (!dir) return;
        await deleteFile(recording.name, dir);
        await loadPersistedRecordings();
    };

    const openInFiles = () => {
        window.dispatchEvent(new CustomEvent('open-app', { detail: { id: 'files', path: 'Media/Screen Recorder' } }));
    };

    const playSavedRecording = (recording: SavedRecording) => {
        cleanupSessionUrl();
        setVideoUrl(recording.url);
        currentBlobRef.current = null;
        setStatus('finished');
        setError(null);
    };

    const reset = () => {
        cleanupSessionUrl();
        currentBlobRef.current = null;
        setVideoUrl(null);
        setTimer(0);
        setStatus('idle');
        setError(null);
        setSaveMessage(null);
        setOpenInFilesVisible(false);
        chunksRef.current = [];
    };

    const renderRecentRecordings = () => (
        <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-200">Recent Recordings</h3>
                {opfsSupported && (
                    <button
                        onClick={openInFiles}
                        className="rounded-md border border-white/20 px-2 py-1 text-xs text-gray-300 hover:bg-white/10"
                    >
                        Open in Files
                    </button>
                )}
            </div>
            {savedRecordings.length === 0 ? (
                <p className="text-xs text-gray-500">No recordings saved to Files yet.</p>
            ) : (
                <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {savedRecordings.map((recording) => (
                        <div key={recording.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                            <div className="min-w-0">
                                <p className="truncate text-sm text-gray-200">{recording.name}</p>
                                <p className="text-xs text-gray-400">{new Date(recording.createdAt).toLocaleString()} • {formatSize(recording.sizeBytes)}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => playSavedRecording(recording)}
                                    aria-label={`Play ${recording.name}`}
                                    className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/20"
                                >
                                    Play
                                </button>
                                <button
                                    onClick={() => void downloadSavedRecording(recording)}
                                    aria-label={`Download ${recording.name}`}
                                    className="rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-xs text-blue-300 hover:bg-blue-500/20"
                                >
                                    Download
                                </button>
                                <button
                                    onClick={() => void deleteSavedRecording(recording)}
                                    aria-label={`Delete ${recording.name}`}
                                    className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const recordingUnavailableMessage = !hasMediaRecorder || !hasDisplayMedia
        ? 'Screen recording is unavailable in this browser (MediaRecorder/getDisplayMedia required).'
        : null;

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
                            className="flex w-full max-w-2xl flex-col items-center gap-6"
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
                                    {micEnabled ? 'Microphone On' : 'Microphone Off'}
                                </button>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => void startRecording()}
                                disabled={!!recordingUnavailableMessage}
                                className="group relative flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full font-medium shadow-lg shadow-red-900/20 transition-all"
                            >
                                <RecordIcon />
                                <span>Start Recording</span>
                                <div className="absolute inset-0 rounded-full border border-white/20" />
                            </motion.button>

                            {recordingUnavailableMessage && <p className="text-yellow-300 text-xs">{recordingUnavailableMessage}</p>}
                            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                            {saveMessage && <p className="text-emerald-300 text-xs">{saveMessage}</p>}

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
                                <video aria-label="Recorded screen playback" src={videoUrl} controls playsInline className="w-full h-full object-contain" />
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-3 py-2 shrink-0">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={reset}
                                    className="px-6 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Discard
                                </motion.button>

                                {opfsSupported && currentBlobRef.current && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => void saveToFiles()}
                                        className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium shadow-lg shadow-emerald-900/20"
                                    >
                                        Save to Files
                                    </motion.button>
                                )}

                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => void saveRecordingExternally()}
                                    disabled={!currentBlobRef.current}
                                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-lg shadow-blue-900/20"
                                >
                                    <DownloadIcon />
                                    Save as {supportedMimeType.includes('mp4') ? 'MP4' : 'WebM'}
                                </motion.button>

                                {openInFilesVisible && (
                                    <button
                                        onClick={openInFiles}
                                        className="rounded-lg border border-white/20 px-4 py-3 text-sm text-gray-200 hover:bg-white/10"
                                    >
                                        Open in Files
                                    </button>
                                )}
                            </div>
                            {saveMessage && <p className="text-emerald-300 text-xs">{saveMessage}</p>}
                            {error && <p className="text-red-400 text-xs">{error}</p>}

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
