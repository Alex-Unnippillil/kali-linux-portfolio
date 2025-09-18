import React, { useEffect, useRef, useState } from 'react';
import ProgressBar, {
    computeEtaSeconds,
    type ProgressMetadata,
} from '../base/ProgressBar';

const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

interface OperationProgress {
    progress: number;
    metadata: ProgressMetadata;
}

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [saveProgress, setSaveProgress] = useState<OperationProgress | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
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
        } catch {
            // ignore
        }
    };

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
                const total = blob.size;
                const chunkSize = 512 * 1024;
                let written = 0;
                const startedAt =
                    typeof performance !== 'undefined' && typeof performance.now === 'function'
                        ? performance.now()
                        : Date.now();

                setSaveProgress({
                    progress: total === 0 ? 100 : 5,
                    metadata: {
                        step: { current: 1, total: 2, label: 'Preparing recording' },
                        detail: `${formatBytes(total)} ready for export`,
                        etaSeconds: null,
                    },
                });

                if (total === 0) {
                    await writable.write(blob);
                } else {
                    for (let offset = 0; offset < total; offset += chunkSize) {
                        const chunk = blob.slice(offset, offset + chunkSize);
                        await writable.write(chunk);
                        written += chunk.size;
                        const percent = Math.min(100, (written / total) * 100);
                        setSaveProgress({
                            progress: percent,
                            metadata: {
                                step: { current: 2, total: 2, label: 'Copying to disk' },
                                detail: `${formatBytes(written)} of ${formatBytes(total)}`,
                                etaSeconds: computeEtaSeconds(written, total, startedAt),
                            },
                        });
                    }
                }

                await writable.close();
                setSaveProgress({
                    progress: 100,
                    metadata: {
                        step: { current: 2, total: 2, label: 'Copying to disk' },
                        detail: `${formatBytes(total)} copied`,
                        etaSeconds: 0,
                    },
                });
                setTimeout(() => setSaveProgress(null), 1200);
            } catch {
                // ignore
                setSaveProgress(null);
            }
        } else {
            const a = document.createElement('a');
            a.href = videoUrl;
            a.download = 'recording.webm';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setSaveProgress(null);
        }
    };

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
            recorderRef.current?.stop();
        };
    }, []);

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white space-y-4 p-4">
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
            {videoUrl && !recording && (
                <>
                    <video src={videoUrl} controls className="max-w-full" />
                    <button
                        type="button"
                        onClick={saveRecording}
                        className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark"
                    >
                        Save Recording
                    </button>
                    {saveProgress && (
                        <div className="w-full max-w-sm">
                            <ProgressBar
                                progress={saveProgress.progress}
                                label="Saving recording"
                                metadata={saveProgress.metadata}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};

