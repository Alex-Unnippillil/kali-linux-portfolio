import React, { useEffect, useRef, useState } from 'react';
import Transcoder, { TranscoderResult } from './screen-recorder/Transcoder';

interface RecordingMeta {
    rawBlob: Blob;
    rawUrl: string;
    duration?: number;
}

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [transcoding, setTranscoding] = useState(false);
    const [rawRecording, setRawRecording] = useState<RecordingMeta | null>(null);
    const [transcoded, setTranscoded] = useState<TranscoderResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progressNotice, setProgressNotice] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const recordingStartRef = useRef<number | null>(null);
    const finalUrlRef = useRef<string | null>(null);

    const resetUrls = () => {
        if (rawRecording?.rawUrl) {
            URL.revokeObjectURL(rawRecording.rawUrl);
        }
        if (finalUrlRef.current) {
            URL.revokeObjectURL(finalUrlRef.current);
            finalUrlRef.current = null;
        }
    };

    const startRecording = async () => {
        try {
            resetUrls();
            setRawRecording(null);
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { frameRate: 60 },
                audio: true,
            });
            streamRef.current = stream;
            const options: MediaRecorderOptions = {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: 6_000_000,
            };
            const recorder = new MediaRecorder(stream, options);
            chunksRef.current = [];
            setError(null);
            setTranscoded(null);
            setProgressNotice(null);
            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                resetUrls();
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
                const url = URL.createObjectURL(blob);
                const duration = recordingStartRef.current
                    ? (performance.now() - recordingStartRef.current) / 1000
                    : undefined;
                setRawRecording({ rawBlob: blob, rawUrl: url, duration });
                setTranscoding(true);
                setRecording(false);
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            };
            recorder.start(250);
            recorderRef.current = recorder;
            recordingStartRef.current = performance.now();
            setRecording(true);
        } catch (err) {
            console.error('[screen-recorder] Unable to start recording', err);
            setError('Recording failed to start. Please allow screen capture permissions.');
        }
    };

    const stopRecording = () => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
        setRecording(false);
    };

    const handleTranscodeComplete = (result: TranscoderResult) => {
        setTranscoding(false);
        setTranscoded(result);
        setProgressNotice(`Saved ${(result.meta.reduction * 100).toFixed(1)}% vs raw capture.`);
        if (finalUrlRef.current) {
            URL.revokeObjectURL(finalUrlRef.current);
        }
        finalUrlRef.current = URL.createObjectURL(result.blob);
    };

    const handleTranscodeError = (err: Error) => {
        console.error('[screen-recorder] Transcoding error', err);
        setTranscoding(false);
        setError(err.message);
    };

    const handleTranscodeCancel = () => {
        setTranscoding(false);
        setProgressNotice('Transcoding cancelled. Raw capture kept.');
    };

    const saveRecording = async () => {
        const blob = transcoded?.blob ?? rawRecording?.rawBlob;
        const url = finalUrlRef.current ?? rawRecording?.rawUrl;
        if (!blob || !url) return;

        if ('showSaveFilePicker' in window) {
            try {
                const handle = await (window as any).showSaveFilePicker({
                    suggestedName: transcoded ? 'recording-transcoded.webm' : 'recording.webm',
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
                setProgressNotice('Recording saved to disk.');
            } catch (err) {
                console.warn('[screen-recorder] Save cancelled', err);
            }
        } else {
            const a = document.createElement('a');
            a.href = url;
            a.download = transcoded ? 'recording-transcoded.webm' : 'recording.webm';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setProgressNotice('Download started.');
        }
    };

    useEffect(() => {
        return () => {
            resetUrls();
            streamRef.current?.getTracks().forEach((t) => t.stop());
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                recorderRef.current.stop();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const currentUrl = transcoded ? finalUrlRef.current : rawRecording?.rawUrl;
    const rawSizeMb = rawRecording ? rawRecording.rawBlob.size / 1024 / 1024 : null;
    const transcodedSizeMb = transcoded ? transcoded.meta.encodedBytes / 1024 / 1024 : null;

    return (
        <div className="flex h-full w-full flex-col space-y-4 bg-ub-cool-grey p-4 text-white">
            <div className="flex items-center space-x-3">
                {!recording && !transcoding && (
                    <button
                        type="button"
                        onClick={startRecording}
                        className="rounded bg-ub-dracula px-4 py-2 font-semibold hover:bg-ub-dracula-dark"
                    >
                        Start Recording
                    </button>
                )}
                {recording && (
                    <button
                        type="button"
                        onClick={stopRecording}
                        className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-700"
                    >
                        Stop Recording
                    </button>
                )}
                {(rawRecording || transcoded) && !recording && !transcoding && (
                    <button
                        type="button"
                        onClick={saveRecording}
                        className="rounded bg-ub-dracula px-4 py-2 text-sm font-semibold hover:bg-ub-dracula-dark"
                    >
                        Save Recording
                    </button>
                )}
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}
            {progressNotice && <p className="text-xs text-ubt-grey">{progressNotice}</p>}

            {recording && <p className="text-xs text-ubt-grey">Recording in progress…</p>}

            {transcoding && rawRecording && (
                <div className="rounded border border-ubt-blue/40 bg-black/20 p-4">
                    <Transcoder
                        blob={rawRecording.rawBlob}
                        onComplete={handleTranscodeComplete}
                        onError={handleTranscodeError}
                        onCancel={handleTranscodeCancel}
                        rawDuration={rawRecording.duration}
                    />
                </div>
            )}

            {currentUrl && !transcoding && (
                <div className="flex flex-1 flex-col space-y-3 overflow-hidden">
                    <video
                        src={currentUrl}
                        controls
                        aria-label="Screen recording preview"
                        className="h-full w-full rounded bg-black"
                    />
                    <div className="grid grid-cols-1 gap-2 text-xs text-ubt-grey sm:grid-cols-2">
                        {rawSizeMb !== null && (
                            <p>Raw capture size: {rawSizeMb.toFixed(2)} MB</p>
                        )}
                        {rawRecording?.duration && (
                            <p>Duration: {rawRecording.duration.toFixed(1)} seconds</p>
                        )}
                        {transcodedSizeMb !== null && (
                            <p>Transcoded size: {transcodedSizeMb.toFixed(2)} MB</p>
                        )}
                        {transcoded && (
                            <p>
                                Reduction: {(transcoded.meta.reduction * 100).toFixed(1)}% via {transcoded.meta.pipeline}
                            </p>
                        )}
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
