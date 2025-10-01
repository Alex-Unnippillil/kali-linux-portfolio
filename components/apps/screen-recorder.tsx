import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CountdownState = 3 | 2 | 1 | 0 | null;

const AUDIO_FALLBACK_LEVEL = 0;

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<CountdownState>(null);
    const [isPreparing, setIsPreparing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
    const [includeMicrophone, setIncludeMicrophone] = useState(false);
    const [hasAudioInput, setHasAudioInput] = useState(false);
    const [audioLevel, setAudioLevel] = useState(AUDIO_FALLBACK_LEVEL);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const combinedStreamRef = useRef<MediaStream | null>(null);
    const sourceStreamsRef = useRef<MediaStream[]>([]);
    const countdownTimeoutRef = useRef<number>();
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const audioRafRef = useRef<number>();

    const supports = useMemo(() => {
        if (typeof navigator === 'undefined') {
            return { system: false, mic: false };
        }
        const mediaDevices = navigator.mediaDevices;
        return {
            system: Boolean(mediaDevices?.getDisplayMedia),
            mic: Boolean(mediaDevices?.getUserMedia),
        };
    }, []);

    const stopAudioMeter = useCallback(() => {
        if (audioRafRef.current) {
            cancelAnimationFrame(audioRafRef.current);
            audioRafRef.current = undefined;
        }
        analyserRef.current = null;
        if (audioSourceRef.current) {
            try {
                audioSourceRef.current.disconnect();
            } catch {
                // ignore disconnect errors in mocked environments
            }
            audioSourceRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {
                // ignore errors closing mocked contexts
            });
            audioContextRef.current = null;
        }
        setAudioLevel(AUDIO_FALLBACK_LEVEL);
    }, []);

    const stopAllStreams = useCallback(() => {
        sourceStreamsRef.current.forEach((stream) => {
            stream.getTracks().forEach((track) => track.stop());
        });
        sourceStreamsRef.current = [];
        combinedStreamRef.current = null;
        setHasAudioInput(false);
    }, []);

    const setupAudioMeter = useCallback((stream: MediaStream) => {
        if (typeof window === 'undefined') return;
        const audioTracks = stream.getAudioTracks();
        if (!audioTracks.length) {
            setAudioLevel(AUDIO_FALLBACK_LEVEL);
            return;
        }

        const AudioContextCtor =
            window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) {
            setAudioLevel(AUDIO_FALLBACK_LEVEL);
            return;
        }

        try {
            const context = new AudioContextCtor();
            audioContextRef.current = context;
            const source = context.createMediaStreamSource(stream);
            audioSourceRef.current = source;
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            source.connect(analyser);
            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const update = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteTimeDomainData(dataArray);
                const sumSquares = dataArray.reduce((sum, value) => {
                    const centered = value - 128;
                    return sum + centered * centered;
                }, 0);
                const rms = Math.sqrt(sumSquares / dataArray.length);
                const normalized = Math.min(1, rms / 128);
                setAudioLevel(Number.isFinite(normalized) ? normalized : AUDIO_FALLBACK_LEVEL);
                audioRafRef.current = requestAnimationFrame(update);
            };

            audioRafRef.current = requestAnimationFrame(update);
        } catch {
            setAudioLevel(AUDIO_FALLBACK_LEVEL);
        }
    }, []);

    const startRecorder = useCallback(() => {
        const stream = combinedStreamRef.current;
        if (!stream) return;
        try {
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };
            recorder.onstop = () => {
                stopAudioMeter();
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                stopAllStreams();
            };
            recorder.start();
            recorderRef.current = recorder;
            setRecording(true);
            setupAudioMeter(stream);
        } catch (err) {
            setError('Unable to start recording in this browser.');
            stopAllStreams();
        }
    }, [setupAudioMeter, stopAllStreams, stopAudioMeter]);

    useEffect(() => {
        if (countdown === null) return undefined;
        if (countdown === 0) {
            setCountdown(null);
            startRecorder();
            return undefined;
        }
        countdownTimeoutRef.current = window.setTimeout(() => {
            setCountdown((prev) => {
                if (prev === null) return null;
                const next = (prev - 1) as CountdownState | 0;
                return next;
            });
        }, 1000);
        return () => {
            if (countdownTimeoutRef.current) {
                clearTimeout(countdownTimeoutRef.current);
            }
        };
    }, [countdown, startRecorder]);

    useEffect(() => {
        if (countdown === null) return undefined;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setCountdown(null);
                stopAllStreams();
                setIsPreparing(false);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [countdown, stopAllStreams]);

    const startRecording = useCallback(async () => {
        if (recording || countdown !== null) return;
        if (typeof navigator === 'undefined') {
            setError('Screen recording is not available in this environment.');
            return;
        }
        if (!navigator.mediaDevices?.getDisplayMedia) {
            setError('Screen recording is not supported in this browser.');
            return;
        }
        setError(null);
        setVideoUrl(null);
        setIsPreparing(true);

        try {
            const displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: includeSystemAudio,
            });
            const streams: MediaStream[] = [displayStream];
            let microphoneStream: MediaStream | null = null;

            if (includeMicrophone) {
                if (!navigator.mediaDevices.getUserMedia) {
                    throw new Error('Microphone capture is not supported in this browser.');
                }
                microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (microphoneStream) {
                    streams.push(microphoneStream);
                }
            }

            const combined = new MediaStream();
            streams.forEach((stream) => {
                stream.getTracks().forEach((track) => combined.addTrack(track));
            });

            sourceStreamsRef.current = streams;
            combinedStreamRef.current = combined;
            setHasAudioInput(combined.getAudioTracks().length > 0);
            setIsPreparing(false);
            setCountdown(3);
        } catch (err) {
            stopAllStreams();
            setIsPreparing(false);

            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setError('Permission denied. Please allow screen recording to continue.');
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Unable to start screen recording.');
            }
        }
    }, [countdown, includeMicrophone, includeSystemAudio, recording, stopAllStreams]);

    const stopRecording = useCallback(() => {
        recorderRef.current?.stop();
        setRecording(false);
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
                // ignore save cancellation
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

    useEffect(() => {
        return () => {
            stopAudioMeter();
            stopAllStreams();
            recorderRef.current?.stop();
        };
    }, [stopAllStreams, stopAudioMeter]);

    return (
        <div className="relative h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white space-y-4 p-4">
            <div className="flex flex-col space-y-3 items-center">
                <fieldset className="flex flex-col space-y-2 text-sm" aria-label="Audio source selection">
                    <legend className="text-base font-semibold text-white">Audio Sources</legend>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={includeSystemAudio}
                            onChange={(event) => setIncludeSystemAudio(event.target.checked)}
                            disabled={!supports.system || isPreparing || recording}
                            aria-label="Toggle system audio capture"
                        />
                        <span className="select-none">
                            System audio{supports.system ? '' : ' (not supported)'}
                        </span>
                    </label>
                    <label className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            checked={includeMicrophone}
                            onChange={(event) => setIncludeMicrophone(event.target.checked)}
                            disabled={!supports.mic || isPreparing || recording}
                            aria-label="Toggle microphone capture"
                        />
                        <span className="select-none">
                            Microphone{supports.mic ? '' : ' (not supported)'}
                        </span>
                    </label>
                </fieldset>

                {!recording && (
                    <button
                        type="button"
                        onClick={startRecording}
                        className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark disabled:opacity-50"
                        disabled={isPreparing}
                    >
                        {isPreparing ? 'Preparing…' : 'Start Recording'}
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
            </div>

            {error && <p role="alert" className="text-red-300 text-center max-w-md">{error}</p>}

            {recording && hasAudioInput && (
                <div className="w-64">
                    <label htmlFor="audio-meter" className="block text-sm mb-1 text-white">
                        Microphone level
                    </label>
                    <div
                        id="audio-meter"
                        role="meter"
                        aria-valuemin={0}
                        aria-valuemax={1}
                        aria-valuenow={Number(audioLevel.toFixed(2))}
                        className="h-3 w-full bg-black bg-opacity-40 rounded"
                        data-testid="audio-meter"
                    >
                        <div
                            className="h-3 bg-green-400 rounded"
                            style={{ width: `${Math.round(audioLevel * 100)}%` }}
                        />
                    </div>
                </div>
            )}

            {videoUrl && !recording && (
                <div className="flex flex-col items-center space-y-3">
                    <video src={videoUrl} controls className="max-w-full" aria-label="Recorded session playback" />
                    <button
                        type="button"
                        onClick={saveRecording}
                        className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark"
                    >
                        Save Recording
                    </button>
                </div>
            )}

            {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
                    <div className="text-6xl font-bold" role="status" aria-live="assertive">
                        {countdown}
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

