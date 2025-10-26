import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import {
    buildSegments,
    detectSplitPoints,
    DetectionSample,
    mergeSegments,
    Segment,
    SegmentHistory,
    SplitPoint,
} from '../../utils/screen-recorder/detection';

const DEFAULT_SILENCE_THRESHOLD = 0.02;
const DEFAULT_MOTION_THRESHOLD = 8;
const DEFAULT_MIN_DURATION = 1500;

const formatMilliseconds = (duration: number) => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    const milliseconds = Math.floor(duration % 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [silenceThreshold, setSilenceThreshold] = useState(DEFAULT_SILENCE_THRESHOLD);
    const [motionThreshold, setMotionThreshold] = useState(DEFAULT_MOTION_THRESHOLD);
    const [minDuration, setMinDuration] = useState(DEFAULT_MIN_DURATION);
    const [samples, setSamples] = useState<DetectionSample[]>([]);
    const [segments, setSegments] = useState<Segment[]>([]);
    const [splitPoints, setSplitPoints] = useState<SplitPoint[]>([]);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [canUndo, setCanUndo] = useState(false);

    const silenceInputId = useId();
    const motionInputId = useId();
    const minDurationId = useId();
    const videoLabelId = useId();

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserIntervalRef = useRef<number | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const videoElementRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const lastFrameRef = useRef<ImageData | null>(null);
    const currentAudioLevelRef = useRef(0);
    const startTimeRef = useRef<number | null>(null);
    const samplesRef = useRef<DetectionSample[]>([]);
    const historyRef = useRef(new SegmentHistory());
    const lastDetectionKeyRef = useRef<string | null>(null);

    const cleanUpStreams = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        videoElementRef.current?.remove();
        videoElementRef.current = null;
        canvasRef.current = null;
        lastFrameRef.current = null;
    }, []);

    const stopAnalyzers = useCallback(() => {
        if (analyserIntervalRef.current) {
            window.clearInterval(analyserIntervalRef.current);
            analyserIntervalRef.current = null;
        }
        if (animationFrameRef.current) {
            window.cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        audioContextRef.current?.close().catch(() => undefined);
        audioContextRef.current = null;
    }, []);

    const resetState = useCallback(() => {
        setSamples([]);
        setSegments([]);
        setSplitPoints([]);
        setRecordingDuration(0);
        historyRef.current.reset();
        setCanUndo(false);
        samplesRef.current = [];
        lastDetectionKeyRef.current = null;
    }, []);

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
    }, [videoUrl]);

    const commitSegments = useCallback(
        (nextSegments: Segment[], options: { pushHistory?: boolean; splits?: SplitPoint[] } = {}) => {
            const { pushHistory = true, splits } = options;
            setSegments(nextSegments);
            if (splits) {
                setSplitPoints(splits);
            }
            if (pushHistory) {
                const snapshot = {
                    segments: nextSegments,
                    splits: splits ?? splitPoints,
                };
                historyRef.current.push(snapshot);
            }
            setCanUndo(historyRef.current.canUndo());
        },
        [splitPoints]
    );

    const runDetection = useCallback(
        (inputSamples: DetectionSample[]) => {
            if (!inputSamples.length) {
                return;
            }

            const options = {
                silenceThreshold,
                motionThreshold,
                minDuration,
            };
            const splits = detectSplitPoints(inputSamples, options);
            const duration = recordingDuration || inputSamples[inputSamples.length - 1].timestamp;
            const newSegments = buildSegments(duration, splits);
            const detectionKey = JSON.stringify({
                options,
                splits: splits.map((split) => ({ time: Math.round(split.time), reasons: split.reasons.slice().sort() })),
                duration: Math.round(duration),
            });
            if (lastDetectionKeyRef.current === detectionKey) {
                return;
            }
            lastDetectionKeyRef.current = detectionKey;
            commitSegments(newSegments, { splits });
        },
        [commitSegments, minDuration, motionThreshold, recordingDuration, silenceThreshold]
    );

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });
            resetState();
            setVideoUrl(null);
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                cleanUpStreams();
            };
            recorderRef.current = recorder;
            recorder.start();
            startTimeRef.current = performance.now();
            setRecording(true);

            const video = document.createElement('video');
            video.srcObject = stream;
            video.muted = true;
            video.playsInline = true;
            await video.play().catch(() => undefined);
            videoElementRef.current = video;

            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 180;
            canvasRef.current = canvas;

            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            audioContextRef.current = audioContext;

            analyserIntervalRef.current = window.setInterval(() => {
                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
                currentAudioLevelRef.current = average / 255;
            }, 200);

            const captureFrame = () => {
                if (!startTimeRef.current) {
                    return;
                }
                const context = canvas.getContext('2d');
                if (!context || !videoElementRef.current) {
                    return;
                }
                context.drawImage(videoElementRef.current, 0, 0, canvas.width, canvas.height);
                const frame = context.getImageData(0, 0, canvas.width, canvas.height);
                let diff = 0;
                if (lastFrameRef.current) {
                    const previous = lastFrameRef.current.data;
                    const current = frame.data;
                    for (let i = 0; i < current.length; i += 4) {
                        diff += Math.abs(current[i] - previous[i]);
                        diff += Math.abs(current[i + 1] - previous[i + 1]);
                        diff += Math.abs(current[i + 2] - previous[i + 2]);
                    }
                    diff /= (current.length / 4) * 3;
                }
                lastFrameRef.current = frame;
                const timestamp = performance.now() - startTimeRef.current;
                samplesRef.current.push({
                    timestamp,
                    audioLevel: currentAudioLevelRef.current,
                    motionScore: diff,
                });
                animationFrameRef.current = window.requestAnimationFrame(captureFrame);
            };

            captureFrame();
        } catch {
            cleanUpStreams();
            stopAnalyzers();
        }
    }, [cleanUpStreams, resetState, stopAnalyzers]);

    const stopRecording = useCallback(() => {
        if (!recording) return;
        recorderRef.current?.stop();
        setRecording(false);
        stopAnalyzers();
        if (startTimeRef.current) {
            const duration = performance.now() - startTimeRef.current;
            setRecordingDuration(duration);
            startTimeRef.current = null;
        }
        setSamples([...samplesRef.current]);
    }, [recording, stopAnalyzers]);

    const mergeSegmentAt = useCallback(
        (index: number) => {
            const merged = mergeSegments(segments, index);
            if (merged !== segments) {
                const updatedSplits = splitPoints.filter((_, splitIndex) => splitIndex !== index);
                lastDetectionKeyRef.current = null;
                commitSegments(merged, { splits: updatedSplits });
            }
        },
        [commitSegments, segments, splitPoints]
    );

    const undoLast = useCallback(() => {
        const previous = historyRef.current.undo();
        if (previous) {
            setSegments(previous.segments);
            setSplitPoints(previous.splits);
            lastDetectionKeyRef.current = null;
        }
        setCanUndo(historyRef.current.canUndo());
    }, []);

    useEffect(() => {
        return () => {
            cleanUpStreams();
            stopAnalyzers();
        };
    }, [cleanUpStreams, stopAnalyzers]);

    useEffect(() => {
        if (!recording && samples.length) {
            runDetection(samples);
        }
    }, [recording, runDetection, samples]);

    useEffect(() => {
        if (!recording && samples.length) {
            runDetection(samples);
        }
    }, [minDuration, motionThreshold, recording, runDetection, samples, silenceThreshold]);

    const splitSummary = useMemo(() => {
        if (!splitPoints.length) {
            return 'No automatic splits detected yet.';
        }
        return `${splitPoints.length} automatic split${splitPoints.length === 1 ? '' : 's'} ready for review.`;
    }, [splitPoints.length]);

    return (
        <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center space-x-3">
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
                <button
                    type="button"
                    onClick={undoLast}
                    disabled={!canUndo}
                    className={`px-4 py-2 rounded border border-white/40 ${
                        canUndo ? 'hover:bg-white/10' : 'opacity-40 cursor-not-allowed'
                    }`}
                >
                    Undo Last Change
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3" aria-label="Detection thresholds">
                <div className="flex flex-col space-y-2">
                    <label htmlFor={silenceInputId} className="text-sm font-semibold">
                        Silence threshold
                    </label>
                    <input
                        id={silenceInputId}
                        type="range"
                        min={0}
                        max={0.5}
                        step={0.005}
                        value={silenceThreshold}
                        onChange={(event) => setSilenceThreshold(Number(event.target.value))}
                        aria-describedby={`${silenceInputId}-value`}
                        aria-label="Silence threshold"
                    />
                    <span id={`${silenceInputId}-value`} className="text-xs text-white/70">
                        Current: {silenceThreshold.toFixed(3)}
                    </span>
                </div>
                <div className="flex flex-col space-y-2">
                    <label htmlFor={motionInputId} className="text-sm font-semibold">
                        Low motion threshold
                    </label>
                    <input
                        id={motionInputId}
                        type="range"
                        min={0}
                        max={50}
                        step={1}
                        value={motionThreshold}
                        onChange={(event) => setMotionThreshold(Number(event.target.value))}
                        aria-describedby={`${motionInputId}-value`}
                        aria-label="Low motion threshold"
                    />
                    <span id={`${motionInputId}-value`} className="text-xs text-white/70">
                        Current: {motionThreshold.toFixed(0)}
                    </span>
                </div>
                <div className="flex flex-col space-y-2">
                    <label htmlFor={minDurationId} className="text-sm font-semibold">
                        Minimum inactivity (ms)
                    </label>
                    <input
                        id={minDurationId}
                        type="number"
                        min={500}
                        max={5000}
                        step={100}
                        value={minDuration}
                        onChange={(event) => setMinDuration(Number(event.target.value))}
                        className="text-black rounded px-2 py-1"
                        aria-label="Minimum inactivity in milliseconds"
                    />
                </div>
            </div>

            <div className="rounded border border-white/20 p-3 bg-black/20" aria-live="polite">
                <p className="text-sm font-semibold">Timeline splits</p>
                <p className="text-xs text-white/70">{splitSummary}</p>
                <div className="mt-3 space-y-2">
                    {segments.map((segment, index) => (
                        <div
                            key={segment.id}
                            className="flex items-center justify-between rounded bg-white/5 px-3 py-2 text-xs md:text-sm"
                        >
                            <div>
                                <p className="font-semibold">
                                    Segment {index + 1}: {formatMilliseconds(segment.start)} -{' '}
                                    {formatMilliseconds(segment.end)}
                                </p>
                                {segment.triggers.length > 0 ? (
                                    <p className="text-white/70">Triggered by {segment.triggers.join(' & ')}</p>
                                ) : (
                                    <p className="text-white/50">Manual adjustment</p>
                                )}
                            </div>
                            {index < segments.length - 1 && (
                                <button
                                    type="button"
                                    onClick={() => mergeSegmentAt(index)}
                                    className="px-3 py-1 rounded bg-ub-dracula hover:bg-ub-dracula-dark"
                                >
                                    Merge with next
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {videoUrl && !recording && (
                <div className="space-y-3">
                    <video
                        id={videoLabelId}
                        aria-label="Recording preview"
                        src={videoUrl}
                        controls
                        className="max-w-full rounded border border-white/10"
                    />
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

