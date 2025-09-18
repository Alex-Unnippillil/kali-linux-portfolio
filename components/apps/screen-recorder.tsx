import React, { useEffect, useMemo, useRef, useState } from 'react';

interface RecorderPreset {
    id: string;
    label: string;
    description: string;
    options: MediaRecorderOptions;
    bitrate: number; // bits per second
}

const PRESETS: RecorderPreset[] = [
    {
        id: 'balanced',
        label: 'Balanced 1080p',
        description: 'Video 4 Mbps · Audio 128 kbps',
        options: {
            mimeType: 'video/webm;codecs=vp9,opus',
            videoBitsPerSecond: 4_000_000,
            audioBitsPerSecond: 128_000,
        },
        bitrate: 4_128_000,
    },
    {
        id: 'efficient',
        label: 'Efficient 720p',
        description: 'Video 2.5 Mbps · Audio 96 kbps',
        options: {
            mimeType: 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: 2_500_000,
            audioBitsPerSecond: 96_000,
        },
        bitrate: 2_596_000,
    },
    {
        id: 'low',
        label: 'Lightweight 480p',
        description: 'Video 1.2 Mbps · Audio 64 kbps',
        options: {
            mimeType: 'video/webm;codecs=vp8,opus',
            videoBitsPerSecond: 1_200_000,
            audioBitsPerSecond: 64_000,
        },
        bitrate: 1_264_000,
    },
];

export const formatBytes = (bytes: number) => {
    if (bytes <= 0) return '0 bytes';
    const units = ['bytes', 'KB', 'MB', 'GB'];
    let index = 0;
    let value = bytes;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    const decimals = index === 0 ? 0 : 2;
    return `${value.toFixed(decimals)} ${units[index]}`;
};

const formatBitrate = (bitrate: number) => {
    if (bitrate <= 0) return '0 bps';
    if (bitrate >= 1_000_000) {
        return `${(bitrate / 1_000_000).toFixed(2)} Mbps`;
    }
    if (bitrate >= 1_000) {
        return `${(bitrate / 1_000).toFixed(0)} kbps`;
    }
    return `${bitrate} bps`;
};

const formatPercentDifference = (actual: number, estimate: number) => {
    if (estimate === 0) return '0%';
    const diff = ((actual - estimate) / estimate) * 100;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
};

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [selectedPresetId, setSelectedPresetId] = useState(PRESETS[0].id);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [estimatedBytes, setEstimatedBytes] = useState<number | null>(null);
    const [actualBytes, setActualBytes] = useState<number | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const presetRef = useRef<RecorderPreset>(PRESETS[0]);

    const selectedPreset = useMemo(() => {
        return PRESETS.find((preset) => preset.id === selectedPresetId) ?? PRESETS[0];
    }, [selectedPresetId]);

    const clearTimer = () => {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    const stopStream = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
    };

    const resetRecordingState = () => {
        setElapsedMs(0);
        setEstimatedBytes(null);
        setActualBytes(null);
        chunksRef.current = [];
        presetRef.current = selectedPreset;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });
            streamRef.current = stream;
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
                setVideoUrl(null);
            }
            resetRecordingState();
            const recorder = new MediaRecorder(stream, selectedPreset.options);
            recorderRef.current = recorder;
            startTimeRef.current = Date.now();
            timerRef.current = window.setInterval(() => {
                if (startTimeRef.current !== null) {
                    setElapsedMs(Date.now() - startTimeRef.current);
                }
            }, 200);
            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                clearTimer();
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                const preset = presetRef.current;
                const durationMs =
                    startTimeRef.current !== null ? Date.now() - startTimeRef.current : elapsedMs;
                startTimeRef.current = null;
                setElapsedMs(durationMs);
                const estimated = (preset.bitrate * (durationMs / 1000)) / 8;
                setEstimatedBytes(estimated);
                setActualBytes(blob.size);
                recorderRef.current = null;
                stopStream();
            };
            recorder.start();
            setRecording(true);
        } catch {
            stopStream();
        }
    };

    const stopRecording = () => {
        clearTimer();
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

    useEffect(() => {
        return () => {
            clearTimer();
            stopStream();
            recorderRef.current?.stop();
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        presetRef.current = selectedPreset;
    }, [selectedPreset]);

    const liveEstimateBytes = recording
        ? (presetRef.current.bitrate * (elapsedMs / 1000)) / 8
        : null;

    return (
        <div className="h-full w-full flex flex-col items-center justify-start bg-ub-cool-grey text-white space-y-4 p-4 overflow-y-auto">
            <div className="w-full max-w-xl space-y-2">
                <h2 className="text-lg font-semibold">Quality presets</h2>
                <div className="flex flex-wrap gap-2">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => !recording && setSelectedPresetId(preset.id)}
                            aria-pressed={preset.id === selectedPresetId}
                            className={`px-3 py-2 rounded border transition-colors ${
                                preset.id === selectedPresetId
                                    ? 'bg-ub-dracula border-ub-dracula'
                                    : 'bg-transparent border-white hover:bg-ub-dracula-light'
                            } ${recording ? 'opacity-60 cursor-not-allowed' : ''}`}
                            disabled={recording}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>
                <p className="text-sm text-ubt-grey">{selectedPreset.description}</p>
                <p className="text-sm">Bitrate: {formatBitrate(selectedPreset.bitrate)}</p>
            </div>
            {!recording && (
                <button
                    type="button"
                    onClick={startRecording}
                    className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark"
                >
                    Start Recording
                </button>
            )}
            {recording && (
                <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700"
                >
                    Stop Recording
                </button>
            )}
            {recording && (
                <div className="w-full max-w-xl space-y-1 text-sm" aria-live="polite">
                    <p>Recording… {Math.max(0, elapsedMs / 1000).toFixed(1)}s</p>
                    <p>Estimated size (live): {formatBytes(liveEstimateBytes ?? 0)}</p>
                </div>
            )}
            {videoUrl && !recording && (
                <div className="w-full max-w-xl space-y-3">
                    <video src={videoUrl} controls className="max-w-full" />
                    <div className="space-y-1 text-sm" aria-live="polite">
                        {estimatedBytes !== null && (
                            <p>Estimated size: {formatBytes(estimatedBytes)}</p>
                        )}
                        {actualBytes !== null && (
                            <p>Actual size: {formatBytes(actualBytes)}</p>
                        )}
                        {estimatedBytes !== null && actualBytes !== null && (
                            <p>
                                Difference: {formatBytes(Math.abs(actualBytes - estimatedBytes))} (
                                {formatPercentDifference(actualBytes, estimatedBytes)})
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={saveRecording}
                        className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark"
                    >
                        Save Recording
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

