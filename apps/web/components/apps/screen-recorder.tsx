import React, { useEffect, useRef, useState } from 'react';

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
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
                </>
            )}
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};

