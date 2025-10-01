import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Draggable, { ControlPosition, DraggableData, DraggableEvent } from 'react-draggable';

const CONTROL_STORAGE_KEY = 'screen-recorder-control-position';
const DEFAULT_CONTROL_POSITION: ControlPosition = { x: 32, y: 32 };

const isValidPosition = (value: unknown): value is ControlPosition => {
    if (!value || typeof value !== 'object') return false;
    const candidate = value as { x?: unknown; y?: unknown };
    return (
        typeof candidate.x === 'number' &&
        Number.isFinite(candidate.x) &&
        typeof candidate.y === 'number' &&
        Number.isFinite(candidate.y)
    );
};

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [controlPosition, setControlPosition] = useState<ControlPosition>(DEFAULT_CONTROL_POSITION);
    const [isClient, setIsClient] = useState(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const dragNodeRef = useRef<HTMLDivElement>(null);
    const controlBarRef = useRef<HTMLDivElement>(null);
    const restoreButtonRef = useRef<HTMLButtonElement>(null);
    const startButtonRef = useRef<HTMLButtonElement>(null);
    const prevRecordingRef = useRef(recording);

    const persistPosition = useCallback((position: ControlPosition) => {
        setControlPosition(position);
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(CONTROL_STORAGE_KEY, JSON.stringify(position));
        } catch {
            // ignore storage errors
        }
    }, []);

    const handleDrag = useCallback((_event: DraggableEvent, data: DraggableData) => {
        setControlPosition({ x: data.x, y: data.y });
    }, []);

    const handleDragStop = useCallback(
        (_event: DraggableEvent, data: DraggableData) => {
            persistPosition({ x: data.x, y: data.y });
        },
        [persistPosition],
    );

    const stopRecording = useCallback(() => {
        recorderRef.current?.stop();
        setRecording(false);
        setIsMinimized(false);
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            setVideoUrl(null);
            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const canCreateUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
                const url = canCreateUrl ? URL.createObjectURL(blob) : null;
                setVideoUrl(url);
                stream.getTracks().forEach((t) => t.stop());
            };
            recorder.start();
            recorderRef.current = recorder;
            setRecording(true);
            setIsMinimized(false);
        } catch {
            // ignore
            setRecording(false);
            setIsMinimized(false);
        }
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
        if (typeof window === 'undefined') return;
        setIsClient(true);
        try {
            const stored = window.localStorage.getItem(CONTROL_STORAGE_KEY);
            if (!stored) return;
            const parsed = JSON.parse(stored);
            if (isValidPosition(parsed)) {
                setControlPosition(parsed);
            }
        } catch {
            // ignore malformed storage entries
        }
    }, []);

    useEffect(() => {
        if (!recording) return undefined;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!event.shiftKey || event.key.toLowerCase() !== 'r') return;
            const isCtrlCombo = event.ctrlKey && !event.metaKey;
            const isMetaCombo = event.metaKey && !event.ctrlKey;
            if (!isCtrlCombo && !isMetaCombo) return;
            event.preventDefault();
            stopRecording();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [recording, stopRecording]);

    useEffect(() => {
        if (!recording) return undefined;
        const timeout = window.setTimeout(() => {
            if (isMinimized) {
                restoreButtonRef.current?.focus({ preventScroll: true });
            } else {
                controlBarRef.current?.focus({ preventScroll: true });
            }
        }, 0);
        return () => window.clearTimeout(timeout);
    }, [isMinimized, recording]);

    useEffect(() => {
        const prevRecording = prevRecordingRef.current;
        if (prevRecording && !recording) {
            setIsMinimized(false);
            if (typeof window !== 'undefined') {
                const timeout = window.setTimeout(() => {
                    startButtonRef.current?.focus({ preventScroll: true });
                }, 0);
                prevRecordingRef.current = recording;
                return () => window.clearTimeout(timeout);
            }
        }
        prevRecordingRef.current = recording;
        return undefined;
    }, [recording]);

    const floatingControls = useMemo(() => {
        if (!isClient || !recording || typeof document === 'undefined') return null;

        const content = (
            <Draggable
                nodeRef={dragNodeRef}
                position={controlPosition}
                onDrag={handleDrag}
                onStop={handleDragStop}
                bounds="body"
            >
                <div ref={dragNodeRef} className="fixed top-0 left-0 z-[2000]">
                    <div className="pointer-events-auto">
                        {isMinimized ? (
                            <button
                                ref={restoreButtonRef}
                                type="button"
                                onClick={() => setIsMinimized(false)}
                                className="rounded bg-ub-dracula px-3 py-2 text-sm font-medium text-white shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-ub-accent"
                            >
                                Restore recording controls
                            </button>
                        ) : (
                            <div
                                ref={controlBarRef}
                                tabIndex={-1}
                                role="dialog"
                                aria-label="Screen recording controls"
                                className="flex items-center gap-3 rounded bg-ub-dracula px-4 py-3 text-sm text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-ub-accent"
                            >
                                <span className="font-semibold" aria-live="polite">
                                    Recording…
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setIsMinimized(true)}
                                    className="rounded bg-ub-cool-grey px-2 py-1 text-xs font-medium text-white hover:bg-ub-grey focus:outline-none focus:ring-2 focus:ring-ub-accent"
                                >
                                    Minimize
                                </button>
                                <button
                                    type="button"
                                    onClick={stopRecording}
                                    className="rounded bg-red-600 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                                >
                                    Stop (Ctrl+Shift+R)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Draggable>
        );

        return createPortal(content, document.body);
    }, [
        controlPosition,
        handleDrag,
        handleDragStop,
        isClient,
        isMinimized,
        recording,
        stopRecording,
    ]);

    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white space-y-4 p-4">
            {!recording && (
                <button
                    type="button"
                    ref={startButtonRef}
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
                    <video src={videoUrl} controls className="max-w-full" aria-label="Screen recording preview" />
                    <button
                        type="button"
                        onClick={saveRecording}
                        className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark"
                    >
                        Save Recording
                    </button>
                </>
            )}
            {floatingControls}
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};

