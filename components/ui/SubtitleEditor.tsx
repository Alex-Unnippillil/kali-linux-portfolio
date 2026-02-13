"use client";

import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";

interface SubtitleCue {
  id?: string;
  start: number;
  end: number;
  text: string;
  settings?: string;
}

interface SubtitleEditorProps {
  videoSrc: string;
  className?: string;
  initialVtt?: string;
}

interface ParsedVtt {
  cues: SubtitleCue[];
  errors: string[];
}

const cloneCues = (list: SubtitleCue[]): SubtitleCue[] =>
  list.map((cue) => ({ ...cue }));

const TIMECODE_REGEX = /^(\d{2,}):([0-5]\d):([0-5]\d)\.(\d{3})$/;

const parseTimestamp = (value: string): number | null => {
  const match = value.trim().match(TIMECODE_REGEX);
  if (!match) {
    return null;
  }
  const [, hours, minutes, seconds, millis] = match;
  const h = Number(hours);
  const m = Number(minutes);
  const s = Number(seconds);
  const ms = Number(millis);
  if ([h, m, s, ms].some((n) => Number.isNaN(n))) {
    return null;
  }
  return h * 3600 + m * 60 + s + ms / 1000;
};

const formatTimestamp = (seconds: number): string => {
  const safeSeconds = Math.max(0, seconds);
  const h = Math.floor(safeSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((safeSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  const ms = Math.round((safeSeconds % 1) * 1000)
    .toString()
    .padStart(3, "0");
  return `${h}:${m}:${s}.${ms}`;
};

const parseVtt = (input: string): ParsedVtt => {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const cues: SubtitleCue[] = [];
  const errors: string[] = [];

  let index = 0;

  if (lines[index]?.startsWith("WEBVTT")) {
    index += 1;
    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }
  }

  while (index < lines.length) {
    let line = lines[index];
    if (!line) {
      index += 1;
      continue;
    }

    const trimmed = line.trim();
    if (trimmed.startsWith("NOTE") || trimmed.startsWith("STYLE") || trimmed.startsWith("REGION")) {
      index += 1;
      while (index < lines.length && lines[index].trim() !== "") {
        index += 1;
      }
      index += 1;
      continue;
    }

    let id: string | undefined;
    if (!line.includes("-->")) {
      id = trimmed;
      index += 1;
      line = lines[index] ?? "";
    }

    if (!line.includes("-->")) {
      errors.push(`Missing timing definition near cue ${cues.length + 1}`);
      while (index < lines.length && lines[index]?.trim() !== "") {
        index += 1;
      }
      index += 1;
      continue;
    }

    const [startRaw, endRawWithSettings] = line.split("-->");
    const [endRaw, ...settingsParts] = endRawWithSettings.trim().split(/\s+/);
    const settings = settingsParts.join(" ");
    const start = parseTimestamp(startRaw.trim());
    const end = parseTimestamp(endRaw.trim());

    if (start === null || end === null) {
      errors.push(`Invalid timestamp in cue ${cues.length + 1}`);
    }

    index += 1;
    const textLines: string[] = [];
    while (index < lines.length && lines[index].trim() !== "") {
      textLines.push(lines[index]);
      index += 1;
    }

    if (start !== null && end !== null) {
      cues.push({
        id,
        start,
        end,
        text: textLines.join("\n"),
        settings: settings || undefined,
      });
    }

    while (index < lines.length && lines[index].trim() === "") {
      index += 1;
    }
  }

  return { cues, errors };
};

const serializeCues = (cues: SubtitleCue[]): string => {
  const header = "WEBVTT\n\n";
  const body = cues
    .map((cue) => {
      const lines: string[] = [];
      if (cue.id) {
        lines.push(cue.id);
      }
      const timing = `${formatTimestamp(cue.start)} --> ${formatTimestamp(cue.end)}`;
      lines.push(cue.settings ? `${timing} ${cue.settings}` : timing);
      lines.push(...cue.text.split("\n"));
      return lines.join("\n");
    })
    .join("\n\n");
  return `${header}${body}${body ? "\n" : ""}`;
};

const SubtitleEditor: React.FC<SubtitleEditorProps> = ({
  videoSrc,
  className = "",
  initialVtt,
}) => {
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const historyRef = useRef<SubtitleCue[][]>([]);
  const futureRef = useRef<SubtitleCue[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [shiftSeconds, setShiftSeconds] = useState(0);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cueInputs, setCueInputs] = useState<Array<{ start: string; end: string }>>([]);
  const fileInputId = useId();
  const shiftInputId = useId();
  const scaleInputId = useId();

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const applyChange = useCallback(
    (mutator: (prev: SubtitleCue[]) => SubtitleCue[]) => {
      setCues((prev) => {
        const previous = cloneCues(prev);
        const next = mutator(previous);
        const hasChanged =
          prev.length !== next.length ||
          prev.some((cue, idx) => {
            const candidate = next[idx];
            if (!candidate) {
              return true;
            }
            return (
              cue.id !== candidate.id ||
              cue.start !== candidate.start ||
              cue.end !== candidate.end ||
              cue.text !== candidate.text ||
              cue.settings !== candidate.settings
            );
          });
        if (!hasChanged) {
          return prev;
        }
        historyRef.current.push(cloneCues(prev));
        futureRef.current = [];
        updateUndoRedoState();
        return next;
      });
    },
    [updateUndoRedoState]
  );

  const replaceCues = useCallback(
    (nextCues: SubtitleCue[], pushHistory = true) => {
      setCues((prev) => {
        const clonedNext = cloneCues(nextCues);
        if (pushHistory && prev.length) {
          historyRef.current.push(cloneCues(prev));
        }
        futureRef.current = [];
        updateUndoRedoState();
        return clonedNext;
      });
    },
    [updateUndoRedoState]
  );

  const undo = useCallback(() => {
    setCues((current) => {
      const previous = historyRef.current.pop();
      if (!previous) {
        return current;
      }
      futureRef.current.push(cloneCues(current));
      const restored = cloneCues(previous);
      updateUndoRedoState();
      return restored;
    });
  }, [updateUndoRedoState]);

  const redo = useCallback(() => {
    setCues((current) => {
      const next = futureRef.current.pop();
      if (!next) {
        return current;
      }
      historyRef.current.push(cloneCues(current));
      const restored = cloneCues(next);
      updateUndoRedoState();
      return restored;
    });
  }, [updateUndoRedoState]);

  useEffect(() => {
    updateUndoRedoState();
  }, [cues, updateUndoRedoState]);

  useEffect(() => {
    if (!initialVtt) {
      return;
    }
    const { cues: parsed, errors } = parseVtt(initialVtt);
    setLoadErrors(errors);
    replaceCues(parsed, false);
  }, [initialVtt, replaceCues]);

  useEffect(() => {
    const vtt = serializeCues(cues);
    const blob = new Blob([vtt], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [cues]);

  useEffect(() => {
    setCueInputs(
      cues.map((cue) => ({
        start: formatTimestamp(cue.start),
        end: formatTimestamp(cue.end),
      }))
    );
  }, [cues]);

  const validation = useMemo(() => {
    const messages: string[] = [];
    const perCue: string[][] = cues.map(() => []);

    cues.forEach((cue, index) => {
      if (!Number.isFinite(cue.start) || cue.start < 0) {
        perCue[index].push("Start time must be a finite value greater than or equal to 0.");
      }
      if (!Number.isFinite(cue.end) || cue.end < 0) {
        perCue[index].push("End time must be a finite value greater than or equal to 0.");
      }
      if (cue.end <= cue.start) {
        perCue[index].push("End time must be greater than start time.");
      }
      if (!cue.text.trim()) {
        perCue[index].push("Cue text cannot be empty.");
      }
    });

    for (let i = 1; i < cues.length; i += 1) {
      if (cues[i].start < cues[i - 1].end) {
        perCue[i - 1].push("Overlaps with the next cue.");
        perCue[i].push("Overlaps with the previous cue.");
      }
    }

    perCue.forEach((issues, idx) => {
      issues.forEach((issue) => {
        messages.push(`Cue ${idx + 1}: ${issue}`);
      });
    });

    return {
      messages,
      perCue,
    };
  }, [cues]);

  const handleFileUpload = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      const input = event.target;
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        const { cues: parsedCues, errors } = parseVtt(text);
        setLoadErrors(errors);
        replaceCues(parsedCues);
        setFileName(file.name);
        setStatusMessage(`Loaded ${parsedCues.length} cues from ${file.name}`);
        input.value = "";
      };
      reader.onerror = () => {
        setLoadErrors(["Failed to read the selected file."]);
        setStatusMessage("Unable to load subtitle file.");
        input.value = "";
      };
      reader.readAsText(file);
    },
    [replaceCues]
  );

  const handleShift = useCallback(() => {
    if (!cues.length || Number.isNaN(shiftSeconds)) {
      return;
    }
    applyChange((prev) => {
      prev.forEach((cue) => {
        cue.start = Math.max(0, cue.start + shiftSeconds);
        cue.end = Math.max(0, cue.end + shiftSeconds);
      });
      return prev;
    });
    setStatusMessage(
      `Shifted timings by ${shiftSeconds >= 0 ? "+" : ""}${shiftSeconds.toFixed(3)} seconds.`
    );
  }, [applyChange, cues.length, shiftSeconds]);

  const handleScale = useCallback(() => {
    if (!cues.length || Number.isNaN(scaleFactor) || scaleFactor <= 0) {
      return;
    }
    applyChange((prev) => {
      prev.forEach((cue) => {
        cue.start = Math.max(0, cue.start * scaleFactor);
        cue.end = Math.max(0, cue.end * scaleFactor);
      });
      return prev;
    });
    setStatusMessage(`Scaled timings by a factor of ${scaleFactor.toFixed(3)}.`);
  }, [applyChange, cues.length, scaleFactor]);

  const handleCueChange = useCallback(
    (index: number, updates: Partial<SubtitleCue>) => {
      applyChange((prev) => {
        const next = prev;
        next[index] = { ...next[index], ...updates };
        return next;
      });
    },
    [applyChange]
  );

  const exportVtt = useCallback(() => {
    const vtt = serializeCues(cues);
    const blob = new Blob([vtt], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName ? fileName.replace(/\.vtt$/i, "-edited.vtt") : "subtitles-edited.vtt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage("Exported subtitles as VTT file.");
  }, [cues, fileName]);

  const seekToCue = useCallback((start: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.currentTime = Math.max(0, start + 0.05);
    void video.play();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [redo, undo]);

  return (
    <div className={`flex flex-col gap-4 ${className}`.trim()}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow">
          <h2 className="text-lg font-semibold text-zinc-100">Subtitle Controls</h2>
          <div className="flex flex-col gap-2 text-sm text-zinc-200">
            <label htmlFor={fileInputId}>Load VTT file</label>
            <input
              id={fileInputId}
              type="file"
              accept=".vtt,text/vtt"
              onChange={handleFileUpload}
              className="rounded border border-zinc-700 bg-zinc-800 p-2 text-sm"
              aria-label="Load VTT file"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex flex-col gap-1 text-sm text-zinc-200">
              <label htmlFor={shiftInputId}>Shift (seconds)</label>
              <input
                id={shiftInputId}
                type="number"
                step="0.01"
                value={shiftSeconds}
                onChange={(event) => setShiftSeconds(Number(event.target.value))}
                className="rounded border border-zinc-700 bg-zinc-800 p-2"
                aria-label="Shift subtitles by seconds"
              />
            </div>
            <div className="flex flex-col gap-1 text-sm text-zinc-200">
              <label htmlFor={scaleInputId}>Scale factor</label>
              <input
                id={scaleInputId}
                type="number"
                step="0.01"
                min="0"
                value={scaleFactor}
                onChange={(event) => setScaleFactor(Number(event.target.value))}
                className="rounded border border-zinc-700 bg-zinc-800 p-2"
                aria-label="Scale subtitle timings"
              />
            </div>
            <button
              type="button"
              onClick={handleShift}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
              disabled={!cues.length}
            >
              Apply Shift
            </button>
            <button
              type="button"
              onClick={handleScale}
              className="rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500"
              disabled={!cues.length}
            >
              Apply Scale
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={undo}
              className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
              disabled={!canUndo}
            >
              Undo (Ctrl/Cmd+Z)
            </button>
            <button
              type="button"
              onClick={redo}
              className="rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
              disabled={!canRedo}
            >
              Redo (Ctrl/Cmd+Shift+Z)
            </button>
            <button
              type="button"
              onClick={exportVtt}
              className="ml-auto rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              disabled={!cues.length || validation.messages.length > 0}
            >
              Export VTT
            </button>
          </div>
          {statusMessage && (
            <p className="text-xs text-emerald-400" role="status">
              {statusMessage}
            </p>
          )}
          {loadErrors.length > 0 && (
            <div className="rounded border border-red-700 bg-red-950/40 p-3 text-sm text-red-300">
              <p className="font-medium">Import warnings</p>
              <ul className="list-disc pl-5">
                {loadErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.messages.length > 0 && (
            <div className="rounded border border-amber-600 bg-amber-950/40 p-3 text-sm text-amber-200">
              <p className="font-medium">Validation issues</p>
              <ul className="list-disc pl-5">
                {validation.messages.map((message, idx) => (
                  <li key={`${message}-${idx}`}>{message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="space-y-3 rounded-lg border border-zinc-700 bg-black p-4 shadow">
          <h2 className="text-lg font-semibold text-zinc-100">Video Preview</h2>
          <video ref={videoRef} src={videoSrc} controls className="w-full rounded border border-zinc-800 bg-black">
            {previewUrl && cues.length > 0 && (
              <track key={previewUrl} kind="subtitles" src={previewUrl} label="Edited subtitles" default />
            )}
          </video>
          <p className="text-xs text-zinc-400">
            Load a VTT file to preview subtitles alongside the video. Validation must pass to export changes.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4 shadow">
        <h2 className="text-lg font-semibold text-zinc-100">Cue List ({cues.length})</h2>
        {cues.length === 0 ? (
          <p className="text-sm text-zinc-400">No cues loaded. Import a VTT file to begin editing.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {cues.map((cue, index) => {
              const cueBaseId = `cue-${index}`;
              const cueIdFieldId = `${cueBaseId}-id`;
              const cueStartId = `${cueBaseId}-start`;
              const cueEndId = `${cueBaseId}-end`;
              const cueSettingsId = `${cueBaseId}-settings`;
              const cueTextId = `${cueBaseId}-text`;

              return (
                <div
                  key={`${cue.id ?? "cue"}-${index}`}
                  className="rounded border border-zinc-800 bg-zinc-950/70 p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="flex flex-col gap-1 text-xs text-zinc-300">
                      <label htmlFor={cueIdFieldId}>ID</label>
                      <input
                        id={cueIdFieldId}
                        type="text"
                        value={cue.id ?? ""}
                        onChange={(event) =>
                          handleCueChange(index, { id: event.target.value || undefined })
                        }
                        className="rounded border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100"
                        placeholder="Optional cue id"
                        aria-label={`Cue ${index + 1} identifier`}
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-zinc-300">
                      <label htmlFor={cueStartId}>Start (HH:MM:SS.mmm)</label>
                      <input
                        id={cueStartId}
                        type="text"
                        value={cueInputs[index]?.start ?? formatTimestamp(cue.start)}
                        onChange={(event) => {
                          const value = event.target.value;
                          setCueInputs((prev) => {
                            const nextInputs = [...prev];
                            nextInputs[index] = {
                              start: value,
                              end: prev[index]?.end ?? formatTimestamp(cue.end),
                            };
                            return nextInputs;
                          });
                        }}
                        onBlur={(event) => {
                          const parsed = parseTimestamp(event.target.value);
                          if (parsed !== null) {
                            handleCueChange(index, { start: parsed });
                          } else {
                            setCueInputs((prev) => {
                              const nextInputs = [...prev];
                              nextInputs[index] = {
                                start: formatTimestamp(cue.start),
                                end: prev[index]?.end ?? formatTimestamp(cue.end),
                              };
                              return nextInputs;
                            });
                          }
                        }}
                        className="rounded border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100"
                        aria-label={`Cue ${index + 1} start time`}
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-zinc-300">
                      <label htmlFor={cueEndId}>End (HH:MM:SS.mmm)</label>
                      <input
                        id={cueEndId}
                        type="text"
                        value={cueInputs[index]?.end ?? formatTimestamp(cue.end)}
                        onChange={(event) => {
                          const value = event.target.value;
                          setCueInputs((prev) => {
                            const nextInputs = [...prev];
                            nextInputs[index] = {
                              start: prev[index]?.start ?? formatTimestamp(cue.start),
                              end: value,
                            };
                            return nextInputs;
                          });
                        }}
                        onBlur={(event) => {
                          const parsed = parseTimestamp(event.target.value);
                          if (parsed !== null) {
                            handleCueChange(index, { end: parsed });
                          } else {
                            setCueInputs((prev) => {
                              const nextInputs = [...prev];
                              nextInputs[index] = {
                                start: prev[index]?.start ?? formatTimestamp(cue.start),
                                end: formatTimestamp(cue.end),
                              };
                              return nextInputs;
                            });
                          }
                        }}
                        className="rounded border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100"
                        aria-label={`Cue ${index + 1} end time`}
                      />
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-zinc-300">
                      <label htmlFor={cueSettingsId}>Settings</label>
                      <input
                        id={cueSettingsId}
                        type="text"
                        value={cue.settings ?? ""}
                        onChange={(event) =>
                          handleCueChange(index, {
                            settings: event.target.value ? event.target.value : undefined,
                          })
                        }
                        className="rounded border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100"
                        placeholder="Optional settings"
                        aria-label={`Cue ${index + 1} settings`}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-col gap-1 text-xs text-zinc-300">
                    <label htmlFor={cueTextId}>Text</label>
                    <textarea
                      id={cueTextId}
                      value={cue.text}
                      onChange={(event) => handleCueChange(index, { text: event.target.value })}
                      rows={3}
                      className="rounded border border-zinc-700 bg-zinc-800 p-2 text-sm text-zinc-100"
                      aria-label={`Cue ${index + 1} text`}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => seekToCue(cue.start)}
                      className="rounded border border-blue-500 px-3 py-1 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
                    >
                      Preview Cue
                    </button>
                    {validation.perCue[index].length > 0 && (
                      <ul className="ml-auto list-disc space-y-1 pl-4 text-xs text-amber-300">
                        {validation.perCue[index].map((message, idx) => (
                          <li key={`${message}-${idx}`}>{message}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubtitleEditor;
