import React, { useCallback, useEffect, useRef, useState } from 'react';

type DisplaySurfaceOption = 'monitor' | 'window' | 'browser';

type DisplayMediaTrackConstraints = MediaTrackConstraints & { displaySurface?: DisplaySurfaceOption };

const DISPLAY_SURFACE_OPTIONS: Array<{ value: DisplaySurfaceOption; label: string; helper: string }> = [
    {
        value: 'monitor',
        label: 'Entire Screen',
        helper: 'Capture everything visible on your display.',
    },
    {
        value: 'window',
        label: 'Application Window',
        helper: 'Share a specific app window only.',
    },
    {
        value: 'browser',
        label: 'Browser Tab',
        helper: 'Share a browser tab with smoother playback.',
    },
];

const getFriendlyError = (error: unknown) => {
    if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
            return 'Screen capture was blocked. Please allow access in your browser settings and try again.';
        }
        if (error.name === 'NotFoundError') {
            return 'No screen, window, or tab was available to capture. Select a source in the prompt and try again.';
        }
        return error.message || 'We were unable to start screen capture. Please try again.';
    }

    return 'We were unable to start screen capture. Please try again.';
};

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [selectedSurface, setSelectedSurface] = useState<DisplaySurfaceOption>('monitor');
    const [includeAudio, setIncludeAudio] = useState(true);
    const [isPreparing, setIsPreparing] = useState(false);
    const [countdownValue, setCountdownValue] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const resetVideoUrl = useCallback(() => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
            setVideoUrl(null);
        }
    }, [videoUrl]);

    const startRecording = useCallback(async () => {
        try {
            resetVideoUrl();
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always',
                    displaySurface: selectedSurface,
                } as DisplayMediaTrackConstraints,
                audio: includeAudio,
            });
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                stream.getTracks().forEach((t) => t.stop());
            };
            recorder.start();
            recorderRef.current = recorder;
            setRecording(true);
            setError(null);
        } catch (err) {
            setError(getFriendlyError(err));
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            setRecording(false);
        } finally {
            setIsPreparing(false);
            setCountdownValue(null);
        }
    }, [includeAudio, resetVideoUrl, selectedSurface]);

    const stopRecording = () => {
        recorderRef.current?.stop();
        setRecording(false);
    };

    const saveRecording = async () => {
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
            } catch {
                // ignore
            }
        } else {
            const a = document.createElement('a');
            a.href = videoUrl;
            a.download = 'recording.webm';
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    };

    const beginPreparation = () => {
        setError(null);
        setIsPreparing(true);
        setCountdownValue(3);
    };

    const cancelPreparation = () => {
        setIsPreparing(false);
        setCountdownValue(null);
    };

    useEffect(() => {
        if (countdownValue === null) return;

        if (countdownValue === 0) {
            setIsPreparing(false);
            setCountdownValue(null);
            void startRecording();
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setCountdownValue((value) => (typeof value === 'number' ? value - 1 : value));
        }, 1000);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [countdownValue, startRecording]);

    useEffect(() => {
        return () => {
            resetVideoUrl();
            streamRef.current?.getTracks().forEach((t) => t.stop());
            recorderRef.current?.stop();
        };
    }, [resetVideoUrl]);

    return (
        <div className="relative h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4">
            <div className="w-full max-w-xl space-y-6">
                <div className="space-y-4 rounded-lg bg-ub-terminal px-4 py-5 shadow-md">
                    <fieldset className="space-y-3">
                        <legend className="text-sm font-semibold uppercase tracking-wide text-ubt-warm-grey">
                            Capture source
                        </legend>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {DISPLAY_SURFACE_OPTIONS.map((option) => (
                                <label
                                    key={option.value}
                                    className={`flex cursor-pointer flex-col rounded border px-3 py-2 transition hover:border-ub-dracula ${
                                        selectedSurface === option.value
                                            ? 'border-ub-dracula bg-ub-grey'
                                            : 'border-ubc-dark'
                                    }`}
                                >
                                    <span className="text-sm font-medium">{option.label}</span>
                                    <span className="mt-1 text-xs text-ubt-warm-grey">{option.helper}</span>
                                    <input
                                        type="radio"
                                        name="display-surface"
                                        value={option.value}
                                        checked={selectedSurface === option.value}
                                        onChange={() => setSelectedSurface(option.value)}
                                        className="sr-only"
                                    />
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <label className="flex items-center space-x-2 text-sm">
                        <input
                            type="checkbox"
                            checked={includeAudio}
                            onChange={(event) => setIncludeAudio(event.target.checked)}
                        />
                        <span>Capture audio</span>
                    </label>
                </div>

                {error && (
                    <div className="space-y-3 rounded-lg border border-red-500 bg-red-900/40 px-4 py-3" role="alert">
                        <p className="text-sm font-medium text-red-100">{error}</p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={beginPreparation}
                                className="rounded bg-ub-dracula px-3 py-1 text-sm font-semibold hover:bg-ub-dracula-dark"
                            >
                                Try again
                            </button>
                            <button
                                type="button"
                                onClick={() => setError(null)}
                                className="rounded border border-red-400 px-3 py-1 text-sm hover:bg-red-800/40"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    {!recording && (
                        <button
                            type="button"
                            onClick={beginPreparation}
                            disabled={isPreparing}
                            className="rounded bg-ub-dracula px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 hover:bg-ub-dracula-dark"
                        >
                            Start recording
                        </button>
                    )}
                    {recording && (
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold transition hover:bg-red-700"
                        >
                            Stop recording
                        </button>
                    )}
                </div>

                {videoUrl && !recording && (
                    <div className="space-y-3">
                        <video src={videoUrl} controls className="max-h-72 w-full rounded border border-ub-grey" />
                        <button
                            type="button"
                            onClick={saveRecording}
                            className="rounded bg-ub-dracula px-4 py-2 text-sm font-semibold transition hover:bg-ub-dracula-dark"
                        >
                            Save recording
                        </button>
                    </div>
                )}
            </div>

            {isPreparing && (
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center"
                    data-testid="countdown-overlay"
                >
                    <div className="text-6xl font-extrabold" data-testid="countdown-value">
                        {countdownValue}
                    </div>
                    <p className="mt-2 text-sm text-ubt-warm-grey">Recording will begin shortly…</p>
                    <button
                        type="button"
                        onClick={cancelPreparation}
                        className="mt-4 rounded border border-white/60 px-4 py-2 text-sm font-semibold hover:bg-white/10"
                    >
                        Cancel
                    </button>
                </div>
            )}
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};

