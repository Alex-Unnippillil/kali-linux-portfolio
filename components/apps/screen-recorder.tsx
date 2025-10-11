import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
    deleteStoredRecording,
    getStoredRecording,
    listStoredRecordings,
    saveRecordingToIndexedDB,
    StoredScreenRecordingSummary,
} from '../../services/screen-recorder/storage';

type RecorderStatus =
    | 'idle'
    | 'requesting'
    | 'recording'
    | 'ready'
    | 'permission-denied'
    | 'unsupported'
    | 'error';

type StorageMode = 'download' | 'indexeddb';

const STORAGE_OPTIONS: { value: StorageMode; label: string }[] = [
    { value: 'download', label: 'Download to device' },
    { value: 'indexeddb', label: 'Keep in browser (IndexedDB)' },
];

async function downloadBlob(blob: Blob, suggestedName: string) {
    const fallbackName = suggestedName.trim() || 'recording.webm';
    if (typeof window === 'undefined') {
        return;
    }

    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as unknown as { showSaveFilePicker: typeof window.showSaveFilePicker }).showSaveFilePicker({
                suggestedName: fallbackName,
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
            return;
        } catch (error) {
            if ((error as DOMException).name !== 'AbortError') {
                console.warn('Unable to use File System Access API, falling back to download link.', error);
            }
        }
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fallbackName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

function getDefaultRecordingName() {
    return `Recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
}

function ScreenRecorder() {
    const [status, setStatus] = useState<RecorderStatus>('idle');
    const [statusMessage, setStatusMessage] = useState('Ready when you are.');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [storageMode, setStorageMode] = useState<StorageMode>('download');
    const [recordingName, setRecordingName] = useState(getDefaultRecordingName());
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [storedRecordings, setStoredRecordings] = useState<StoredScreenRecordingSummary[]>([]);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const lastBlobRef = useRef<Blob | null>(null);

    const isRecording = status === 'recording';
    const isUnsupported = status === 'unsupported';

    const refreshStoredRecordings = useCallback(async () => {
        if (storageMode !== 'indexeddb') {
            return;
        }

        try {
            const records = await listStoredRecordings();
            setStoredRecordings(records.sort((a, b) => b.createdAt - a.createdAt));
        } catch (error) {
            console.error('Failed to read stored recordings', error);
            setErrorMessage('Unable to read recordings saved in this browser.');
        }
    }, [storageMode]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
            setStatus('unsupported');
            setStatusMessage('Screen recording is not supported in this browser.');
            return;
        }

        setStatus('idle');
        setStatusMessage('Ready when you are.');
    }, []);

    useEffect(() => {
        if (storageMode === 'indexeddb') {
            refreshStoredRecordings();
        }
    }, [refreshStoredRecordings, storageMode]);

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            recorderRef.current?.stop();
        };
    }, []);

    useEffect(() => {
        if (!videoUrl) {
            return;
        }

        return () => {
            URL.revokeObjectURL(videoUrl);
        };
    }, [videoUrl]);

    const stopStream = () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    };

    const resetForNewRecording = () => {
        lastBlobRef.current = null;
        chunksRef.current = [];
        setVideoUrl((prev) => {
            if (prev) {
                URL.revokeObjectURL(prev);
            }
            return null;
        });
        setRecordingName(getDefaultRecordingName());
    };

    const handlePermissionError = (error: unknown) => {
        const domError = error as DOMException;
        if (domError?.name === 'NotAllowedError' || domError?.name === 'PermissionDeniedError') {
            setStatus('permission-denied');
            setStatusMessage('Screen capture permission was denied. Allow access and try again.');
        } else if (domError?.name === 'NotFoundError') {
            setStatus('error');
            setStatusMessage('No screen capture sources were found. Try again.');
        } else {
            setStatus('error');
            setStatusMessage('Could not start screen recording.');
        }
        setErrorMessage(domError?.message ?? null);
    };

    const startRecording = useCallback(async () => {
        if (isUnsupported || isRecording) {
            return;
        }

        if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) {
            setStatus('unsupported');
            setStatusMessage('Screen recording is not supported in this browser.');
            return;
        }

        setStatus('requesting');
        setStatusMessage('Requesting permission to capture your screen…');
        setErrorMessage(null);
        resetForNewRecording();

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: 'monitor' },
                audio: true,
            });

            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];

            recorder.ondataavailable = (event: BlobEvent) => {
                if (event.data?.size) {
                    chunksRef.current.push(event.data);
                }
            };

            recorder.onerror = (event) => {
                console.error('MediaRecorder error', event);
                setStatus('error');
                setStatusMessage('Recording error encountered. Please try again.');
            };

            recorder.onstop = async () => {
                stopStream();
                const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
                lastBlobRef.current = blob;

                const url = URL.createObjectURL(blob);
                setVideoUrl(url);
                setStatus('ready');
                if (storageMode === 'indexeddb') {
                    try {
                        await saveRecordingToIndexedDB(recordingName, blob);
                        setStatusMessage('Recording saved inside this browser.');
                        refreshStoredRecordings();
                    } catch (error) {
                        console.error('Failed to store recording in IndexedDB', error);
                        setStatusMessage('Recording is ready. Download it to keep a copy.');
                        setErrorMessage('IndexedDB storage is unavailable.');
                    }
                } else {
                    setStatusMessage('Recording ready. Download it to keep a copy.');
                }
            };

            recorderRef.current = recorder;
            streamRef.current = stream;
            recorder.start();
            setStatus('recording');
            setStatusMessage('Recording in progress. Press stop when finished.');
        } catch (error) {
            stopStream();
            handlePermissionError(error);
        }
    }, [isRecording, isUnsupported, recordingName, refreshStoredRecordings, storageMode]);

    const stopRecording = useCallback(() => {
        if (!isRecording) {
            return;
        }

        recorderRef.current?.stop();
    }, [isRecording]);

    const handleDownloadCurrentRecording = useCallback(async () => {
        if (!lastBlobRef.current) {
            return;
        }

        await downloadBlob(lastBlobRef.current, recordingName);
    }, [recordingName]);

    const handleStoredDownload = useCallback(async (id: string, name: string) => {
        try {
            const record = await getStoredRecording(id);
            if (!record) {
                setErrorMessage('Recording not found. It may have been removed.');
                return;
            }
            await downloadBlob(record.blob, name);
        } catch (error) {
            console.error('Failed to download stored recording', error);
            setErrorMessage('Unable to download the stored recording.');
        }
    }, []);

    const handleDeleteStored = useCallback(
        async (id: string) => {
            try {
                await deleteStoredRecording(id);
                refreshStoredRecordings();
            } catch (error) {
                console.error('Failed to delete stored recording', error);
                setErrorMessage('Unable to delete the stored recording.');
            }
        },
        [refreshStoredRecordings],
    );

    const statusTone = useMemo(() => {
        if (status === 'error' || status === 'permission-denied') {
            return 'text-red-300';
        }
        if (status === 'recording') {
            return 'text-yellow-200';
        }
        if (status === 'ready') {
            return 'text-green-200';
        }
        return 'text-white';
    }, [status]);

    return (
        <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 space-y-4 overflow-y-auto" role="application">
            <div>
                <p className={`text-sm ${statusTone}`} role="status">
                    {statusMessage}
                </p>
                {errorMessage && <p className="mt-1 text-xs text-red-300">{errorMessage}</p>}
                {isUnsupported && (
                    <p className="mt-2 text-xs text-ub-muted">
                        Your browser does not expose the MediaRecorder API. Use a Chromium-based browser or a desktop recorder to
                        capture your screen.
                    </p>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2" aria-label="Screen recorder configuration">
                <label className="flex flex-col text-xs uppercase tracking-wide text-ub-muted" htmlFor="screen-recorder-storage">
                    Storage target
                    <select
                        id="screen-recorder-storage"
                        className="mt-1 rounded bg-ub-grey text-white p-2 text-sm"
                        value={storageMode}
                        onChange={(event) => setStorageMode(event.target.value as StorageMode)}
                        disabled={isRecording}
                    >
                        {STORAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col text-xs uppercase tracking-wide text-ub-muted" htmlFor="screen-recorder-name">
                    Recording name
                    <input
                        id="screen-recorder-name"
                        className="mt-1 rounded bg-ub-grey text-white p-2 text-sm"
                        value={recordingName}
                        onChange={(event) => setRecordingName(event.target.value)}
                        disabled={isRecording}
                        type="text"
                        aria-label="Recording name"
                    />
                </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={startRecording}
                    disabled={isRecording || isUnsupported}
                    className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark disabled:bg-ub-grey disabled:text-ub-muted"
                >
                    {status === 'requesting' ? 'Requesting permission…' : isRecording ? 'Recording…' : 'Start recording'}
                </button>
                <button
                    type="button"
                    onClick={stopRecording}
                    disabled={!isRecording}
                    className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 disabled:bg-ub-grey disabled:text-ub-muted"
                >
                    Stop recording
                </button>
                {status === 'ready' && lastBlobRef.current && (
                    <button
                        type="button"
                        onClick={handleDownloadCurrentRecording}
                        className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark"
                    >
                        Download recording
                    </button>
                )}
            </div>

            {videoUrl && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold">Preview</h2>
                    <video
                        src={videoUrl}
                        controls
                        className="max-h-64 w-full rounded bg-black"
                        aria-label="Screen recording preview"
                    />
                </div>
            )}

            {storageMode === 'indexeddb' && (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold">Saved recordings</h2>
                    {storedRecordings.length === 0 ? (
                        <p className="text-xs text-ub-muted">Recordings saved to IndexedDB will appear here.</p>
                    ) : (
                        <ul className="space-y-2 text-sm" aria-live="polite">
                            {storedRecordings.map((record) => (
                                <li
                                    key={record.id}
                                    className="flex flex-col gap-2 rounded border border-ub-grey-dark p-2 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="font-medium">{record.name}</p>
                                        <p className="text-xs text-ub-muted">
                                            Saved {new Date(record.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            className="px-3 py-1 rounded bg-ub-dracula hover:bg-ub-dracula-dark text-xs"
                                            onClick={() => handleStoredDownload(record.id, record.name)}
                                        >
                                            Download
                                        </button>
                                        <button
                                            type="button"
                                            className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-xs"
                                            onClick={() => handleDeleteStored(record.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {status === 'permission-denied' && (
                <div className="rounded border border-yellow-600 bg-yellow-900/30 p-3 text-xs">
                    <p className="font-semibold text-yellow-200">Permission denied</p>
                    <p className="mt-1 text-yellow-100">
                        Re-run the recorder and allow screen sharing when prompted. Some browsers require you to pick a screen or
                        window before the recording starts.
                    </p>
                </div>
            )}

            {status === 'unsupported' && (
                <div className="rounded border border-ub-grey-dark bg-black/30 p-3 text-xs text-ub-muted">
                    <p className="font-semibold text-white">MediaRecorder unavailable</p>
                    <p className="mt-1">
                        Try Chrome, Edge, or another Chromium-based browser. If you need a fallback, use the system recorder
                        installed on your OS.
                    </p>
                </div>
            )}
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};

