import React, { useEffect, useMemo, useRef, useState } from 'react';

export type TranscodePipeline = 'webcodecs' | 'media-recorder';

type Status = 'idle' | 'running' | 'complete' | 'error';

type FrameCallbackMetadata = {
    mediaTime: number;
};

type WorkerMessage =
    | { type: 'frame'; bitmap: ImageBitmap; timestamp: number }
    | { type: 'progress'; processed: number; total?: number }
    | { type: 'complete' }
    | { type: 'ready' }
    | { type: 'error'; message: string };

type WorkerCommand =
    | { type: 'start'; width: number; height: number; sampleRate: number; quality: number }
    | { type: 'frame'; bitmap: ImageBitmap; timestamp: number }
    | { type: 'finish' }
    | { type: 'cancel' };

export interface CapabilityReport {
    webCodecs: boolean;
    mediaRecorder: boolean;
    worker: boolean;
}

export interface TranscodeMeta {
    pipeline: TranscodePipeline;
    rawBytes: number;
    encodedBytes: number;
    reduction: number;
    startedAt: number;
    completedAt: number;
    codec: string;
    duration?: number;
    frameCount?: number;
}

export interface TranscoderResult {
    blob: Blob;
    meta: TranscodeMeta;
}

export interface TranscoderProps {
    blob: Blob;
    onComplete(result: TranscoderResult): void;
    onCancel(): void;
    onError(error: Error): void;
    preferredCodec?: string;
    autoStart?: boolean;
    rawDuration?: number;
}

export const supportsWebCodecs = (target?: Window & typeof globalThis): boolean => {
    const scope = target ?? (typeof window !== 'undefined' ? window : undefined);
    if (!scope) return false;
    return (
        'VideoFrame' in scope &&
        'MediaStreamTrackGenerator' in scope &&
        'Worker' in scope &&
        'createImageBitmap' in scope
    );
};

export const detectCapabilities = (target?: Window & typeof globalThis): CapabilityReport => {
    const scope = target ?? (typeof window !== 'undefined' ? window : undefined);
    return {
        webCodecs: supportsWebCodecs(scope as Window & typeof globalThis),
        mediaRecorder: Boolean(scope && 'MediaRecorder' in scope),
        worker: Boolean(scope && 'Worker' in scope),
    };
};

export const selectPipeline = (capabilities: CapabilityReport): TranscodePipeline => {
    if (capabilities.webCodecs && capabilities.worker) return 'webcodecs';
    if (capabilities.mediaRecorder) return 'media-recorder';
    throw new Error('No supported transcoding pipeline available.');
};

export const handlePipelineError = (
    capabilities: CapabilityReport,
    error: unknown,
): TranscodePipeline => {
    if (capabilities.mediaRecorder) {
        console.warn('[screen-recorder] WebCodecs pipeline failed, falling back to MediaRecorder.', error);
        return 'media-recorder';
    }
    throw error instanceof Error ? error : new Error(String(error));
};

export const calculateReduction = (rawBytes: number, encodedBytes: number): number => {
    if (rawBytes === 0) return 0;
    return Math.max(0, 1 - encodedBytes / rawBytes);
};

export const createTranscodeWorker = () => new Worker(new URL('./transcode.worker.ts', import.meta.url));

const DEFAULT_TARGET_FPS = 30;
const TARGET_REDUCTION = 0.25;

const Transcoder: React.FC<TranscoderProps> = ({
    blob,
    onComplete,
    onCancel,
    onError,
    preferredCodec = 'video/webm;codecs=vp9',
    autoStart = true,
    rawDuration,
}) => {
    const capabilities = useMemo(() => detectCapabilities(), []);
    const [pipeline, setPipeline] = useState<TranscodePipeline>(() => selectPipeline(capabilities));
    const [status, setStatus] = useState<Status>('idle');
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Preparing transcoder…');
    const [meta, setMeta] = useState<TranscodeMeta | null>(null);
    const cancelRef = useRef(false);
    const workerRef = useRef<Worker | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const writerCloseRef = useRef<() => void>(() => {});
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const cleanup = () => {
        if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
        }
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            try {
                recorderRef.current.stop();
            } catch (err) {
                console.warn('[screen-recorder] Failed to stop recorder', err);
            }
        }
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.removeAttribute('src');
            videoRef.current.load();
        }
    };

    const finalize = (result: TranscoderResult) => {
        setStatus('complete');
        setProgress(1);
        setMeta(result.meta);
        setMessage(
            result.meta.reduction >= TARGET_REDUCTION
                ? `Compression saved ${(result.meta.reduction * 100).toFixed(1)}%`
                : 'Compression finished (less than target reduction)'
        );
        onComplete(result);
    };

    const runMediaRecorderFallback = async () => {
        cancelRef.current = false;
        setPipeline('media-recorder');
        setMessage('Falling back to MediaRecorder-based transcoding…');
        if (!('document' in globalThis)) {
            onError(new Error('MediaRecorder fallback is unavailable in the current environment.'));
            return;
        }

        const url = URL.createObjectURL(blob);
        const video = document.createElement('video');
        videoRef.current = video;
        video.src = url;
        video.muted = true;
        video.playsInline = true;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
            URL.revokeObjectURL(url);
            onError(new Error('Unable to acquire 2D canvas context.'));
            return;
        }

        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(canvas.captureStream(DEFAULT_TARGET_FPS), {
            mimeType: preferredCodec,
            videoBitsPerSecond: 2_000_000,
        });
        recorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };
        recorder.onerror = (event) => {
            console.error('[screen-recorder] MediaRecorder fallback error', event.error);
            cleanup();
            onError(event.error);
        };

        const startedAt = performance.now();

        const stopRecording = () => {
            if (recorder.state !== 'inactive') {
                recorder.stop();
            }
        };

        recorder.onstop = () => {
            const encodedBlob = new Blob(chunks, { type: recorder.mimeType });
            const reduction = calculateReduction(blob.size, encodedBlob.size);
            finalize({
                blob: encodedBlob,
                meta: {
                    pipeline: 'media-recorder',
                    rawBytes: blob.size,
                    encodedBytes: encodedBlob.size,
                    reduction,
                    startedAt,
                    completedAt: performance.now(),
                    codec: recorder.mimeType,
                    duration: video.duration || rawDuration,
                },
            });
            cleanup();
            URL.revokeObjectURL(url);
        };

        const drawFrame = () => {
            if (cancelRef.current) {
                stopRecording();
                return;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (!video.paused && !video.ended) {
                requestAnimationFrame(drawFrame);
            }
        };

        const updateProgress = () => {
            if (cancelRef.current) return;
            if (video.duration > 0) {
                const pct = Math.min(0.99, video.currentTime / video.duration);
                setProgress(pct);
            }
            if (!video.paused && !video.ended) {
                requestAnimationFrame(updateProgress);
            }
        };

        video.addEventListener('loadedmetadata', () => {
            cancelRef.current = false;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            setStatus('running');
            setMessage('Re-encoding via MediaRecorder fallback…');
            recorder.start(500);
            video.play().catch((err) => {
                cleanup();
                onError(err);
            });
            requestAnimationFrame(drawFrame);
            requestAnimationFrame(updateProgress);
        });

        video.addEventListener('ended', stopRecording);
        video.addEventListener('error', (event) => {
            cleanup();
            onError(event.error || new Error('Failed to load video for fallback transcoding.'));
        });
    };

    const runWebCodecsPipeline = async () => {
        cancelRef.current = false;
        setPipeline('webcodecs');
        setStatus('running');
        setMessage('Optimizing recording with WebCodecs…');

        if (!capabilities.webCodecs || !capabilities.worker) {
            const fallback = handlePipelineError(capabilities, new Error('WebCodecs unavailable.'));
            if (fallback === 'media-recorder') {
                runMediaRecorderFallback();
                return;
            }
            return;
        }

        const worker = createTranscodeWorker();
        workerRef.current = worker;

        const url = URL.createObjectURL(blob);
        const video = document.createElement('video');
        videoRef.current = video;
        video.src = url;
        video.muted = true;
        video.playsInline = true;

        const generator = new (window as any).MediaStreamTrackGenerator({ kind: 'video' });
        const writer = generator.writable.getWriter();
        writerCloseRef.current = () => {
            try {
                writer.close();
            } catch (err) {
                console.warn('[screen-recorder] Failed to close generator writer', err);
            }
        };

        const processedStream = new MediaStream();
        processedStream.addTrack(generator);
        const recorder = new MediaRecorder(processedStream, {
            mimeType: preferredCodec,
            videoBitsPerSecond: 1_500_000,
        });
        recorderRef.current = recorder;

        const chunks: Blob[] = [];
        let processedFrames = 0;
        let totalFramesEstimate = rawDuration ? Math.ceil(rawDuration * DEFAULT_TARGET_FPS) : undefined;
        const startedAt = performance.now();

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunks.push(event.data);
            }
        };

        recorder.onerror = (event) => {
            console.error('[screen-recorder] Recorder error during WebCodecs pipeline', event.error);
            cleanup();
            const fallback = handlePipelineError(capabilities, event.error);
            if (fallback === 'media-recorder') {
                runMediaRecorderFallback();
            }
        };

        recorder.onstop = () => {
            const encodedBlob = new Blob(chunks, { type: recorder.mimeType });
            const reduction = calculateReduction(blob.size, encodedBlob.size);
            finalize({
                blob: encodedBlob,
                meta: {
                    pipeline: 'webcodecs',
                    rawBytes: blob.size,
                    encodedBytes: encodedBlob.size,
                    reduction,
                    startedAt,
                    completedAt: performance.now(),
                    codec: recorder.mimeType,
                    duration: video.duration || rawDuration,
                    frameCount: processedFrames,
                },
            });
            cleanup();
            URL.revokeObjectURL(url);
        };

        const handleWorkerMessage = (event: MessageEvent<WorkerMessage>) => {
            const data = event.data;
            if (!data) return;
            switch (data.type) {
                case 'frame': {
                    const frame = new VideoFrame(data.bitmap, { timestamp: data.timestamp });
                    data.bitmap.close();
                    writer.write(frame).catch((err) => {
                        console.error('[screen-recorder] Failed to write frame', err);
                        cleanup();
                        const fallback = handlePipelineError(capabilities, err);
                        if (fallback === 'media-recorder') {
                            runMediaRecorderFallback();
                        }
                    });
                    frame.close();
                    processedFrames += 1;
                    if (totalFramesEstimate) {
                        const pct = Math.min(0.95, processedFrames / totalFramesEstimate);
                        setProgress(pct);
                    }
                    break;
                }
                case 'progress': {
                    if (data.total) {
                        totalFramesEstimate = data.total;
                        const pct = Math.min(0.95, data.processed / data.total);
                        setProgress(pct);
                    } else if (totalFramesEstimate) {
                        const pct = Math.min(0.95, data.processed / totalFramesEstimate);
                        setProgress(pct);
                    }
                    break;
                }
                case 'complete': {
                    writerCloseRef.current();
                    if (recorder.state !== 'inactive') {
                        recorder.stop();
                    }
                    break;
                }
                case 'error': {
                    cleanup();
                    const err = new Error(data.message);
                    const fallback = handlePipelineError(capabilities, err);
                    if (fallback === 'media-recorder') {
                        runMediaRecorderFallback();
                    }
                    break;
                }
                default:
                    break;
            }
        };

        worker.addEventListener('message', handleWorkerMessage);

        const pumpVideoFrames = () => {
            if (cancelRef.current) {
                worker.postMessage({ type: 'cancel' } as WorkerCommand);
                return;
            }
            const pump = () => {
                if (cancelRef.current) {
                    worker.postMessage({ type: 'cancel' } as WorkerCommand);
                    return;
                }
                if ('requestVideoFrameCallback' in video) {
                    (video as HTMLVideoElement & {
                        requestVideoFrameCallback(callback: (now: DOMHighResTimeStamp, metadata: FrameCallbackMetadata) => void): number;
                    }).requestVideoFrameCallback(async (_now, metadata) => {
                        if (cancelRef.current) return;
                        try {
                            const bitmap = await createImageBitmap(video);
                            worker.postMessage(
                                {
                                    type: 'frame',
                                    bitmap,
                                    timestamp: Math.round(metadata.mediaTime * 1_000_000),
                                } as WorkerCommand,
                                [bitmap],
                            );
                        } catch (err) {
                            const fallback = handlePipelineError(capabilities, err);
                            if (fallback === 'media-recorder') {
                                runMediaRecorderFallback();
                            }
                        }
                        if (!video.paused && !video.ended) {
                            pump();
                        } else {
                            worker.postMessage({ type: 'finish' } as WorkerCommand);
                        }
                    });
                } else {
                    const draw = async () => {
                        if (cancelRef.current) return;
                        try {
                            const bitmap = await createImageBitmap(video);
                            worker.postMessage(
                                {
                                    type: 'frame',
                                    bitmap,
                                    timestamp: Math.round(video.currentTime * 1_000_000),
                                } as WorkerCommand,
                                [bitmap],
                            );
                        } catch (err) {
                            const fallback = handlePipelineError(capabilities, err);
                            if (fallback === 'media-recorder') {
                                runMediaRecorderFallback();
                            }
                        }
                        if (!video.paused && !video.ended) {
                            requestAnimationFrame(draw);
                        } else {
                            worker.postMessage({ type: 'finish' } as WorkerCommand);
                        }
                    };
                    requestAnimationFrame(draw);
                }
            };
            pump();
        };

        video.addEventListener('loadedmetadata', () => {
            cancelRef.current = false;
            const estimatedDuration = video.duration || rawDuration;
            if (estimatedDuration) {
                totalFramesEstimate = Math.max(1, Math.ceil(estimatedDuration * DEFAULT_TARGET_FPS));
            }
            worker.postMessage({
                type: 'start',
                width: video.videoWidth,
                height: video.videoHeight,
                sampleRate: DEFAULT_TARGET_FPS,
                quality: 0.75,
            } as WorkerCommand);
            recorder.start(500);
            video.play()
                .then(() => {
                    pumpVideoFrames();
                })
                .catch((err) => {
                    cleanup();
                    const fallback = handlePipelineError(capabilities, err);
                    if (fallback === 'media-recorder') {
                        runMediaRecorderFallback();
                    }
                });
        });

        video.addEventListener('ended', () => {
            worker.postMessage({ type: 'finish' } as WorkerCommand);
        });

        video.addEventListener('error', (event) => {
            cleanup();
            const err = event.error || new Error('Video element failed to decode for WebCodecs pipeline.');
            const fallback = handlePipelineError(capabilities, err);
            if (fallback === 'media-recorder') {
                runMediaRecorderFallback();
            }
        });
    };

    const cancel = () => {
        cancelRef.current = true;
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'cancel' } as WorkerCommand);
        }
        if (videoRef.current) {
            videoRef.current.pause();
        }
        cleanup();
        onCancel();
    };

    useEffect(() => {
        if (!autoStart) return () => cleanup();
        setStatus('running');
        try {
            const selectedPipeline = selectPipeline(capabilities);
            setPipeline(selectedPipeline);
            if (selectedPipeline === 'webcodecs') {
                runWebCodecsPipeline();
            } else {
                runMediaRecorderFallback();
            }
        } catch (err) {
            setStatus('error');
            const error = err instanceof Error ? err : new Error(String(err));
            setMessage(error.message);
            onError(error);
        }
        return () => {
            cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [blob]);

    return (
        <div className="w-full space-y-4 text-sm">
            <div className="space-y-1">
                <p className="font-semibold text-ubt-blue">Transcoding recording</p>
                <p className="text-ubt-grey">Pipeline: {pipeline}</p>
                <p className="text-ubt-grey">{message}</p>
                {meta && (
                    <p className="text-ubt-grey">
                        Output size {(meta.encodedBytes / 1024 / 1024).toFixed(2)} MB (saved{' '}
                        {(meta.reduction * 100).toFixed(1)}%)
                    </p>
                )}
            </div>
            <div className="h-2 w-full rounded bg-ub-cool-grey/40">
                <div
                    className="h-full rounded bg-ubt-blue transition-all"
                    style={{ width: `${Math.floor(progress * 100)}%` }}
                />
            </div>
            <div className="flex items-center justify-between text-xs text-ubt-grey">
                <span>Status: {status}</span>
                <span>{Math.floor(progress * 100)}%</span>
            </div>
            <button
                type="button"
                onClick={cancel}
                className="rounded bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700"
            >
                Cancel
            </button>
        </div>
    );
};

export default Transcoder;
