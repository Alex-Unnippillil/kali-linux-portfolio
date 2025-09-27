import React, { useEffect, useRef, useState } from 'react';

type ScreenRecorderProps = {
    initialVideoUrl?: string | null;
};

function ScreenRecorder({ initialVideoUrl = null }: ScreenRecorderProps = {}) {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const captionTrackRef = useRef<HTMLTrackElement | null>(null);
    const [captionsEnabled, setCaptionsEnabled] = useState(true);
    const [muted, setMuted] = useState(true);

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
            streamRef.current?.getTracks().forEach((t) => t.stop());
            recorderRef.current?.stop();
        };
    }, []);

    useEffect(() => {
        const track = captionTrackRef.current;
        if (!track) return;
        track.mode = captionsEnabled ? 'showing' : 'disabled';
    }, [captionsEnabled]);

    useEffect(() => {
        if (!videoRef.current) return;
        videoRef.current.muted = muted;
    }, [muted]);

    const toggleCaptions = () => setCaptionsEnabled((value) => !value);
    const toggleMute = () => setMuted((value) => !value);

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white space-y-4 p-4">
            <p id="screen-recorder-video-description" className="sr-only">
                Playback of recorded screen captures. Audio starts muted to prevent echo. Captions summarize playback controls.
            </p>
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
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        className="max-w-full"
                        muted={muted}
                        playsInline
                        aria-describedby="screen-recorder-video-description"
                        data-testid="screen-recorder-video"
                    >
                        <track
                            ref={captionTrackRef}
                            kind="captions"
                            srcLang="en"
                            src="/captions/screen-recorder.vtt"
                            label="Screen recorder instructions"
                            default
                        />
                    </video>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={toggleCaptions}
                            aria-pressed={captionsEnabled}
                            className="px-4 py-2 rounded bg-purple-700"
                        >
                            {captionsEnabled ? 'Hide Captions' : 'Show Captions'}
                        </button>
                        <button
                            type="button"
                            onClick={toggleMute}
                            aria-pressed={!muted}
                            className="px-4 py-2 rounded bg-blue-700"
                        >
                            {muted ? 'Unmute' : 'Mute'}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={saveRecording}
                        className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark"
                    >
                        Save Recording
                    </button>
                </>
            )}
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};

