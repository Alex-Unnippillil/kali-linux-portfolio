import React, { useEffect, useRef, useState } from 'react';
import {
    clearRecordings,
    deleteRecording,
    listRecordings,
    renameRecording,
    saveRecording,
    type StoredRecording,
} from './screen-recorder-storage';

function formatDuration(durationMs: number) {
    if (!durationMs || Number.isNaN(durationMs)) return '0s';
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) {
        return `${seconds}s`;
    }
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function formatFileSize(bytes: number) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function sanitizeFileName(name: string) {
    return name.replace(/[\\/:*?"<>|]+/g, '_');
}

function ScreenRecorder() {
    const [recording, setRecording] = useState(false);
    const [recordings, setRecordings] = useState<StoredRecording[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
    const previewUrlsRef = useRef(previewUrls);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const startedAtRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            recorderRef.current?.stop();
        };
    }, []);

    useEffect(() => {
        listRecordings()
            .then((items) => {
                setRecordings(items);
                if (items.length > 0) {
                    setSelectedId(items[0].id);
                }
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        setPreviewUrls((prev) => {
            const next: Record<string, string> = {};
            recordings.forEach((record) => {
                next[record.id] = prev[record.id] ?? URL.createObjectURL(record.blob);
            });
            Object.entries(prev).forEach(([id, url]) => {
                if (!next[id]) {
                    URL.revokeObjectURL(url);
                }
            });
            return next;
        });
    }, [recordings]);

    useEffect(() => {
        previewUrlsRef.current = previewUrls;
    }, [previewUrls]);

    useEffect(() => {
        return () => {
            Object.values(previewUrlsRef.current).forEach((url) => {
                URL.revokeObjectURL(url);
            });
        };
    }, []);

    const getPreviewUrl = (id: string) => previewUrls[id];

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });
            streamRef.current = stream;
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            startedAtRef.current = Date.now();
            recorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                const durationMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
                chunksRef.current = [];
                startedAtRef.current = null;
                stream.getTracks().forEach((t) => t.stop());
                setRecording(false);
                try {
                    const saved = await saveRecording(blob, durationMs);
                    setRecordings((prev) => [saved, ...prev]);
                    setSelectedId(saved.id);
                } catch (err) {
                    // ignore persistence errors
                }
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

    const handleRename = async (id: string) => {
        const updated = await renameRecording(id, editingName);
        if (updated) {
            setRecordings((prev) => prev.map((record) => (record.id === id ? updated : record)));
        }
        setEditingId(null);
        setEditingName('');
    };

    const handleDelete = async (id: string) => {
        await deleteRecording(id);
        setRecordings((prev) => {
            const next = prev.filter((record) => record.id !== id);
            setSelectedId((current) => {
                if (current && current === id) {
                    return next[0]?.id ?? null;
                }
                return current;
            });
            return next;
        });
    };

    const handleClearAll = async () => {
        if (!recordings.length) return;
        const confirmed = window.confirm('Delete all stored recordings? This cannot be undone.');
        if (!confirmed) return;
        await clearRecordings();
        setRecordings([]);
        setSelectedId(null);
    };

    const handleDownload = (record: StoredRecording) => {
        const url = getPreviewUrl(record.id) ?? URL.createObjectURL(record.blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = sanitizeFileName(record.name || 'recording');
        a.download = `${safeName}.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (!getPreviewUrl(record.id)) {
            URL.revokeObjectURL(url);
        }
    };

    const selectedRecording = selectedId ? recordings.find((record) => record.id === selectedId) : null;
    const selectedUrl = selectedRecording ? getPreviewUrl(selectedRecording.id) : null;

    return (
        <div className="h-full w-full flex justify-center bg-ub-cool-grey text-white overflow-y-auto">
            <div className="w-full max-w-5xl p-6 space-y-6">
                <div className="flex flex-wrap gap-3">
                    {!recording && (
                        <button
                            type="button"
                            onClick={startRecording}
                            className="px-4 py-2 rounded bg-ub-dracula hover:bg-ub-dracula-dark transition"
                        >
                            Start Recording
                        </button>
                    )}
                    {recording && (
                        <button
                            type="button"
                            onClick={stopRecording}
                            className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 transition"
                        >
                            Stop Recording
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleClearAll}
                        disabled={!recordings.length}
                        className="px-4 py-2 rounded bg-ub-grey text-white/80 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                        Clear All
                    </button>
                </div>

                {selectedRecording && selectedUrl && (
                    <section className="bg-black/40 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h2 className="text-lg font-semibold">{selectedRecording.name}</h2>
                            <p className="text-sm text-white/70">
                                {formatDuration(selectedRecording.durationMs)} · {formatFileSize(selectedRecording.size)}
                            </p>
                        </div>
                        <video
                            src={selectedUrl}
                            controls
                            className="w-full rounded border border-white/10"
                            playsInline
                            aria-label={`${selectedRecording.name} playback`}
                        />
                    </section>
                )}

                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-md font-semibold">Saved Recordings</h3>
                        {loading && <span className="text-sm text-white/70">Loading…</span>}
                    </div>
                    {recordings.length === 0 && !loading ? (
                        <p className="text-white/70 text-sm">No recordings saved yet. Capture your screen to see them here.</p>
                    ) : (
                        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {recordings.map((record) => {
                                const previewUrl = getPreviewUrl(record.id);
                                const isEditing = editingId === record.id;
                                return (
                                    <li
                                        key={record.id}
                                        className="bg-black/30 rounded-lg p-3 space-y-3 border border-transparent hover:border-white/20 transition"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setSelectedId(record.id)}
                                            className="block w-full focus:outline-none"
                                            aria-label={`Open ${record.name}`}
                                        >
                                            {previewUrl ? (
                                                <video
                                                    src={previewUrl}
                                                    className="w-full h-40 object-cover rounded"
                                                    muted
                                                    loop
                                                    playsInline
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <div className="w-full h-40 bg-ub-grey rounded animate-pulse" />
                                            )}
                                        </button>
                                        <div className="space-y-2">
                                            {isEditing ? (
                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        void handleRename(record.id);
                                                    }}
                                                    className="space-y-2"
                                                >
                                                    <input
                                                        type="text"
                                                        value={editingName}
                                                        onChange={(e) => setEditingName(e.target.value)}
                                                        className="w-full px-2 py-1 rounded bg-black/60 border border-white/20 text-sm"
                                                        aria-label="Recording name"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="submit"
                                                            className="px-2 py-1 rounded bg-ub-dracula text-sm"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingId(null);
                                                                setEditingName('');
                                                            }}
                                                            className="px-2 py-1 rounded bg-ub-grey text-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </form>
                                            ) : (
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedId(record.id)}
                                                            className="text-left text-sm font-medium hover:text-white"
                                                        >
                                                            {record.name}
                                                        </button>
                                                        <p className="text-xs text-white/60">
                                                            {formatDuration(record.durationMs)} · {formatFileSize(record.size)}
                                                        </p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingId(record.id);
                                                            setEditingName(record.name);
                                                        }}
                                                        className="text-xs text-white/70 hover:text-white"
                                                    >
                                                        Rename
                                                    </button>
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-2 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(record)}
                                                    className="px-2 py-1 rounded bg-ub-dracula hover:bg-ub-dracula-dark"
                                                >
                                                    Download
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(record.id)}
                                                    className="px-2 py-1 rounded bg-red-600 hover:bg-red-700"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
    return <ScreenRecorder />;
};
