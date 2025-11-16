import React, { useCallback, useEffect, useRef, useState } from 'react';
import Effects, { EffectStrategy } from './screen-recorder/Effects';

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [sourceStream, setSourceStream] = useState<MediaStream | null>(null);
    const [effectInfo, setEffectInfo] = useState<{
        usingEffects: boolean;
        strategy: EffectStrategy;
        blurStrength: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const sourceStreamRef = useRef<MediaStream | null>(null);
    const processedStreamRef = useRef<MediaStream | null>(null);
    const pendingStartRef = useRef(false);
    const recordingRef = useRef(recording);

    useEffect(() => {
        recordingRef.current = recording;
    }, [recording]);

    const resetVideoUrl = useCallback((url: string | null) => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
        if (url === null) {
            chunksRef.current = [];
        }
        setVideoUrl(url);
    }, [videoUrl]);

    const handleRecorderStop = useCallback(() => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        resetVideoUrl(url);
        setRecording(false);
        const source = sourceStreamRef.current;
        if (source) {
            source.getTracks().forEach((track) => track.stop());
        }
        setSourceStream(null);
        setEffectInfo(null);
        processedStreamRef.current = null;
    }, [resetVideoUrl]);

    const beginRecording = useCallback(
        (processed: MediaStream | null) => {
            const baseStream = sourceStreamRef.current;
            if (!baseStream) {
                pendingStartRef.current = false;
                return;
            }

            const combined = new MediaStream();
            const candidateStream = processed ?? baseStream;
            const videoTrack = candidateStream.getVideoTracks()[0] ?? baseStream.getVideoTracks()[0];
            if (videoTrack) {
                combined.addTrack(videoTrack);
            }
            baseStream.getAudioTracks().forEach((track) => combined.addTrack(track));

            chunksRef.current = [];

            let recorder: MediaRecorder;
            try {
                recorder = new MediaRecorder(combined, {
                    mimeType: 'video/webm;codecs=vp9,opus',
                    videoBitsPerSecond: 4_000_000,
                });
            } catch {
                recorder = new MediaRecorder(combined);
            }

            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };
            recorder.onstop = handleRecorderStop;
            recorder.onerror = () => {
                handleRecorderStop();
            };

            recorderRef.current = recorder;
            pendingStartRef.current = false;
            recorder.start(500);
            setRecording(true);
        },
        [handleRecorderStop]
    );

    const handleProcessedStream = useCallback(
        (stream: MediaStream | null, info: { usingEffects: boolean; strategy: EffectStrategy; blurStrength: number }) => {
            processedStreamRef.current = stream;
            setEffectInfo(info);
            if (pendingStartRef.current && !recordingRef.current) {
                beginRecording(stream);
            }
        },
        [beginRecording]
    );

    const startRecording = useCallback(async () => {
        if (recording) {
            return;
        }
        setError(null);
        if (videoUrl) {
            resetVideoUrl(null);
        }
        setEffectInfo(null);
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: { ideal: 30, max: 60 },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
                audio: true,
            });
            sourceStreamRef.current = stream;
            setSourceStream(stream);
            pendingStartRef.current = true;
            chunksRef.current = [];
        } catch (err) {
            pendingStartRef.current = false;
            setError('Screen capture request was blocked or cancelled.');
        }
    }, [recording, resetVideoUrl, videoUrl]);

    const stopRecording = useCallback(() => {
        pendingStartRef.current = false;
        recorderRef.current?.stop();
    }, []);

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
            sourceStreamRef.current?.getTracks().forEach((t) => t.stop());
            recorderRef.current?.stop();
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
        };
    }, [videoUrl]);

    return (
        <div className="h-full w-full overflow-y-auto bg-ub-cool-grey text-white p-4">
            <div className="mx-auto flex max-w-4xl flex-col space-y-4">
                <header className="flex flex-col gap-1">
                    <h1 className="text-xl font-semibold">Screen Recorder</h1>
                    <p className="text-sm text-ub-light-grey">
                        Share your screen, toggle background segmentation on the fly, and export the capture when finished.
                    </p>
                </header>

                <section className="rounded-lg border border-ub-cool-grey bg-black/30 p-4">
                    {sourceStream ? (
                        <Effects stream={sourceStream} onStreamReady={handleProcessedStream} />
                    ) : (
                        <div className="flex h-64 flex-col items-center justify-center space-y-2 text-ub-light-grey">
                            <p className="text-sm">Start a capture to preview and configure background effects.</p>
                            <p className="text-xs">Effects respect system reduce-motion preferences automatically.</p>
                        </div>
                    )}
                </section>

                <section className="flex flex-wrap items-center gap-3">
                    {!recording ? (
                        <button
                            type="button"
                            onClick={startRecording}
                            className="rounded bg-ub-dracula px-4 py-2 font-medium text-white transition hover:bg-ub-dracula-dark"
                        >
                            {sourceStream ? 'Restart Recording' : 'Start Recording'}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="rounded bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
                        >
                            Stop Recording
                        </button>
                    )}
                    {effectInfo && (
                        <div className="text-xs text-ub-light-grey">
                            <p>
                                Effects: {effectInfo.usingEffects ? 'Enabled' : 'Disabled'} · Strategy: {effectInfo.strategy.toUpperCase()}
                            </p>
                        </div>
                    )}
                    {error && <p className="text-xs text-red-400">{error}</p>}
                </section>

                {videoUrl && !recording && (
                    <section className="space-y-3 rounded-lg border border-ub-cool-grey bg-black/30 p-4">
                        <video
                            src={videoUrl}
                            controls
                            aria-label="Recorded screen capture preview"
                            className="w-full rounded"
                        />
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={saveRecording}
                                className="rounded bg-ub-dracula px-4 py-2 font-medium text-white transition hover:bg-ub-dracula-dark"
                            >
                                Save Recording
                            </button>
                            <button
                                type="button"
                                onClick={() => resetVideoUrl(null)}
                                className="rounded border border-ub-cool-grey px-4 py-2 text-sm text-ub-light-grey transition hover:border-white hover:text-white"
                            >
                                Discard
                            </button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};

