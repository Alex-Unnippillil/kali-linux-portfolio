import React, { useCallback, useEffect, useRef, useState } from 'react';
import useOPFS from '../../hooks/useOPFS';
import Toast from '../ui/Toast';

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const unmountedRef = useRef(false);
    const { supported: filesSupported, getDir, writeFile } = useOPFS();

    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [videoUrl]);

    const saveToFilesApp = useCallback(
        async (blob: Blob) => {
            if (!filesSupported) return false;
            try {
                const recordingsDir = await getDir('recordings');
                if (!recordingsDir) return false;

                const now = new Date();
                const timestamp = now.toISOString().replace(/[:.]/g, '-');
                const fileName = `recording-${timestamp}.webm`;
                const saved = await writeFile(fileName, blob, recordingsDir);
                if (!saved) return false;

                try {
                    const metadataDir = await getDir('recordings/.metadata');
                    if (metadataDir) {
                        await writeFile(
                            `${fileName}.json`,
                            JSON.stringify(
                                {
                                    tag: 'recording',
                                    tags: ['recording'],
                                    createdAt: now.toISOString(),
                                    fileName,
                                },
                                null,
                                2,
                            ),
                            metadataDir,
                        );
                    }
                } catch {
                    // Metadata is optional; ignore failures.
                }

                setToast(`Saved to Files → recordings/${fileName}`);
                return true;
            } catch {
                return false;
            }
        },
        [filesSupported, getDir, writeFile],
    );

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            setToast('');
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                if (unmountedRef.current) return;
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                recorderRef.current = null;
            };
            recorder.start();
            recorderRef.current = recorder;
            setRecording(true);
        } catch {
            // ignore
        }
    };

    const stopRecording = () => {
        if (recorderRef.current) {
            const recorder = recorderRef.current;
            recorderRef.current = null;
            recorder.stop();
        }
        setRecording(false);
    };

    const saveRecording = async () => {
        if (!videoUrl || saving) return;
        setSaving(true);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        try {
            const savedToFiles = await saveToFilesApp(blob);
            if (!savedToFiles) {
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
            }
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        return () => {
            unmountedRef.current = true;
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            if (recorderRef.current) {
                const recorder = recorderRef.current;
                recorderRef.current = null;
                recorder.stop();
            }
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
                    <video
                        src={videoUrl}
                        controls
                        className="max-w-full"
                        aria-label="Screen recording preview"
                    />
                    <button
                        type="button"
                        onClick={saveRecording}
                        disabled={saving}
                        className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark disabled:opacity-50"
                    >
                        Save Recording
                    </button>
                </>
            )}
            {toast && <Toast message={toast} onClose={() => setToast('')} />}
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};

