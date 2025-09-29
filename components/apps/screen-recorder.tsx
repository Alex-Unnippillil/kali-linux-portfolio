import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type RecorderStatus =
    | 'idle'
    | 'awaiting-permission'
    | 'recording'
    | 'processing'
    | 'ready'
    | 'error';

const StatusIndicator: React.FC<{ status: RecorderStatus; message: string }> = ({ status, message }) => {
    const color = useMemo(() => {
        switch (status) {
            case 'recording':
                return 'bg-red-500';
            case 'awaiting-permission':
                return 'bg-yellow-400';
            case 'processing':
                return 'bg-blue-400';
            case 'ready':
                return 'bg-green-500';
            case 'error':
                return 'bg-red-600';
            default:
                return 'bg-gray-400';
        }
    }, [status]);

    return (
        <div className="flex items-center gap-2 text-sm text-white/80">
            <span className={`inline-block h-3 w-3 rounded-full ${color}`} aria-hidden />
            <span className="font-medium">{message}</span>
        </div>
    );
};

function ScreenRecorder() {
    const [status, setStatus] = useState<RecorderStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('Ready to start a new recording.');
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedMic, setSelectedMic] = useState<string>('none');
    const [isEnumerating, setIsEnumerating] = useState(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const displayStreamRef = useRef<MediaStream | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);

    const stopTracks = useCallback(() => {
        displayStreamRef.current?.getTracks().forEach((t) => {
            try {
                t.stop();
            } catch {
                /* ignore */
            }
        });
        micStreamRef.current?.getTracks().forEach((t) => {
            try {
                t.stop();
            } catch {
                /* ignore */
            }
        });
        displayStreamRef.current = null;
        micStreamRef.current = null;
    }, []);

    const loadAudioDevices = useCallback(async () => {
        if (!navigator.mediaDevices?.enumerateDevices) {
            setAudioDevices([]);
            return;
        }
        setIsEnumerating(true);
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs = devices.filter((device) => device.kind === 'audioinput');
            setAudioDevices(inputs);
            if (inputs.length === 0) {
                setError(
                    'No recording devices were reported by the browser. Connect a microphone and press “Refresh devices”, or continue with “No microphone”.',
                );
                if (selectedMic !== 'none') {
                    setSelectedMic('none');
                }
            } else {
                setError((previous) =>
                    previous && previous.startsWith('No recording devices') ? null : previous,
                );
            }
        } catch {
            setError('The browser blocked access to the device list. Allow microphone access in the address bar, then retry.');
        } finally {
            setIsEnumerating(false);
        }
    }, [selectedMic]);

    const startRecording = useCallback(async () => {
        if (!navigator.mediaDevices?.getDisplayMedia) {
            setStatus('error');
            setStatusMessage('Screen capture is not supported.');
            setError('Screen capture APIs are unavailable in this browser. Try Chrome, Edge, or another Chromium-based browser.');
            return;
        }

        setShowPermissionModal(false);
        setError(null);
        setStatus('awaiting-permission');
        setStatusMessage('Waiting for you to pick what to share…');

        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 30 },
                audio: selectedMic !== 'none',
            });

            displayStreamRef.current = displayStream;
            chunksRef.current = [];

            if (selectedMic !== 'none') {
                try {
                    const audioConstraints: MediaTrackConstraints =
                        selectedMic === 'default'
                            ? { noiseSuppression: true }
                            : { deviceId: { exact: selectedMic }, noiseSuppression: true };
                    const micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
                    micStreamRef.current = micStream;
                    micStream.getAudioTracks().forEach((track) => displayStream.addTrack(track));
                } catch {
                    setError(
                        'The selected microphone could not be started. The recording will continue with system audio only. Check that no other tab or application is locking the mic.',
                    );
                }
            }

            const recorder = new MediaRecorder(displayStream);
            recorderRef.current = recorder;

            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                setStatus('processing');
                setStatusMessage('Finalising your recording…');
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                stopTracks();
                setStatus('ready');
                setStatusMessage('Recording ready — you can preview or save it below.');
            };

            recorder.start();
            setStatus('recording');
            setStatusMessage('Recording in progress. Use “Stop sharing” when finished.');
        } catch (err) {
            stopTracks();
            setStatus('error');
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setStatusMessage('Screen capture permission denied.');
                setError(
                    'Screen sharing was blocked. Click the screen icon in the address bar, allow access, then press “Start recording” again.',
                );
            } else if (err instanceof DOMException && err.name === 'NotFoundError') {
                setStatusMessage('No shareable screens were found.');
                setError('The browser could not find a display to capture. If you cancelled the prompt, try again and select a screen.');
            } else {
                setStatusMessage('Something went wrong while starting the recording.');
                setError('The recording could not start. Refresh the page and try again, or check another browser.');
            }
        }
    }, [selectedMic, stopTracks]);

    const stopRecording = useCallback(() => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        } else {
            stopTracks();
            setStatus('idle');
            setStatusMessage('Recording stopped.');
        }
    }, [stopTracks]);

    const saveRecording = useCallback(async () => {
        if (!videoUrl) return;
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: 'recording.webm',
                    types: [
                        {
                            description: 'WebM video',
                            accept: { 'video/webm': ['.webm'] },
                        },
                    ],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                setStatusMessage('Recording saved to your device.');
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') {
                    setStatusMessage('Save cancelled. The recording is still available below.');
                }
            }
        } else {
            const a = document.createElement('a');
            a.href = videoUrl;
            a.download = 'recording.webm';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setStatusMessage('Recording download started.');
        }
    }, [videoUrl]);

    useEffect(() => {
        loadAudioDevices();
        if (!navigator.mediaDevices?.addEventListener) return;
        const handler = () => loadAudioDevices();
        navigator.mediaDevices.addEventListener('devicechange', handler);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', handler);
        };
    }, [loadAudioDevices]);

    useEffect(() => {
        return () => {
            stopTracks();
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                recorderRef.current.stop();
            }
        };
    }, [stopTracks]);

    const micOptions = useMemo(() => {
        const options = [
            { label: 'No microphone (screen only)', value: 'none' },
            { label: 'Browser default microphone', value: 'default' },
            ...audioDevices.map((device, index) => ({
                label: device.label || `Microphone ${index + 1}`,
                value: device.deviceId,
            })),
        ];
        return options;
    }, [audioDevices]);

    return (
        <div className="relative flex h-full w-full flex-col items-center justify-start gap-6 bg-ub-cool-grey p-6 text-white">
            <div className="flex w-full max-w-xl flex-col gap-4 rounded-lg bg-black/30 p-4">
                <StatusIndicator status={status} message={statusMessage} />
                {error && (
                    <div className="rounded border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">
                        <p className="font-semibold">Having trouble?</p>
                        <p>{error}</p>
                    </div>
                )}
                <div className="flex flex-col gap-2">
                    <label htmlFor="screen-mic-select" className="text-sm font-semibold text-white/80">
                        Microphone source
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <select
                            id="screen-mic-select"
                            value={selectedMic}
                            onChange={(event) => setSelectedMic(event.target.value)}
                            className="w-full rounded border border-white/20 bg-black/40 p-2 text-white"
                        >
                            {micOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={loadAudioDevices}
                            className="rounded bg-ub-dracula px-3 py-2 text-sm font-medium hover:bg-ub-dracula-dark"
                            disabled={isEnumerating}
                        >
                            {isEnumerating ? 'Refreshing…' : 'Refresh devices'}
                        </button>
                    </div>
                    <p className="text-xs text-white/60">
                        Choose “No microphone” if you only want to capture the screen. Selecting a specific input may require that
                        you grant microphone permission.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => setShowPermissionModal(true)}
                        className="rounded bg-ub-dracula px-4 py-2 font-semibold hover:bg-ub-dracula-dark"
                        disabled={status === 'recording' || status === 'awaiting-permission'}
                    >
                        {status === 'recording' ? 'Recording…' : 'Start recording'}
                    </button>
                    <button
                        type="button"
                        onClick={stopRecording}
                        className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={status !== 'recording' && status !== 'awaiting-permission'}
                    >
                        Stop sharing
                    </button>
                </div>
                {videoUrl && (
                    <div className="flex flex-col gap-3">
                        <video
                            src={videoUrl}
                            controls
                            className="max-h-64 w-full rounded border border-white/10"
                            aria-label="Screen recording playback"
                        />
                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={saveRecording}
                                className="rounded bg-ub-dracula px-4 py-2 font-semibold hover:bg-ub-dracula-dark"
                            >
                                Save recording
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setVideoUrl(null);
                                    chunksRef.current = [];
                                    setStatus('idle');
                                    setStatusMessage('Ready to start a new recording.');
                                }}
                                className="rounded bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
                            >
                                Discard &amp; start again
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {showPermissionModal && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                    <div className="max-w-lg rounded-lg bg-ub-dark p-6 text-left text-white shadow-xl">
                        <h2 className="text-lg font-semibold">Grant screen sharing permission</h2>
                        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/80">
                            <li>When your browser prompt appears, choose the screen, window, or tab you want to share.</li>
                            <li>Ensure the “Share system audio” checkbox is ticked if you want to capture computer sound.</li>
                            <li>Click <strong>Share</strong> to begin recording.</li>
                        </ol>
                        <p className="mt-3 text-xs text-white/60">
                            If the prompt does not show, make sure screen capture is allowed for this site in your browser’s address
                            bar controls.
                        </p>
                        <div className="mt-4 flex flex-wrap justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowPermissionModal(false)}
                                className="rounded bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={startRecording}
                                className="rounded bg-ub-dracula px-4 py-2 text-sm font-semibold hover:bg-ub-dracula-dark"
                            >
                                Share my screen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};

