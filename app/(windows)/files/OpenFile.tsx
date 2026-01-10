"use client";

import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FilePickerAcceptType = {
  description?: string;
  accept: Record<string, string[]>;
};

type FilePickerOptions = {
  multiple?: boolean;
  excludeAcceptAllOption?: boolean;
  types?: FilePickerAcceptType[];
};

type FilePickerWindow = typeof window & {
  showOpenFilePicker?: (options?: FilePickerOptions) => Promise<FileSystemFileHandle[]>;
};

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "NotAllowedError")
  );
}

export default function OpenFile() {
  const [supportsPicker, setSupportsPicker] = useState<boolean | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const pickerWindow = window as FilePickerWindow;
    setSupportsPicker(typeof pickerWindow.showOpenFilePicker === "function");
  }, []);

  const resetFallbackInput = useCallback(() => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
  }, []);

  const readSelectedFile = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      setFileName(file.name);
      setFileContent(text);
      setError(null);
    } catch (err) {
      console.error("Failed to read file", err);
      setError("Failed to read the selected file.");
    }
  }, []);

  const handleFallbackChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        resetFallbackInput();
        return;
      }
      await readSelectedFile(file);
      resetFallbackInput();
    },
    [readSelectedFile, resetFallbackInput],
  );

  const handleOpenClick = useCallback(async () => {
    if (typeof window === "undefined") return;
    const pickerWindow = window as FilePickerWindow;

    if (!pickerWindow.showOpenFilePicker) {
      fileInputRef.current?.click();
      return;
    }

    try {
      const [handle] = await pickerWindow.showOpenFilePicker({ multiple: false });
      if (!handle) return;
      const file = await handle.getFile();
      await readSelectedFile(file);
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      console.error("Error selecting file", err);
      setError("Unable to open the selected file.");
    }
  }, [readSelectedFile]);

  const instructions = useMemo(() => {
    if (supportsPicker === false) {
      return "Your browser does not support the File System Access API. Use the fallback picker to open a file.";
    }
    if (supportsPicker === null) {
      return "Select a file to preview its contents.";
    }
    return "Click \"Open file\" to choose a document and view its contents.";
  }, [supportsPicker]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 text-sm text-neutral-100">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleOpenClick}
          className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1 font-medium hover:bg-neutral-700"
        >
          Open file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFallbackChange}
          className="hidden"
        />
        {supportsPicker === false ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1 font-medium hover:bg-neutral-700"
          >
            Use fallback picker
          </button>
        ) : null}
      </div>
      <p className="text-xs text-neutral-400">{instructions}</p>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
      <div className="flex flex-1 flex-col overflow-hidden rounded border border-neutral-700 bg-neutral-900/60">
        <div className="border-b border-neutral-800 bg-neutral-900/80 px-3 py-2">
          <p className="text-xs font-semibold text-neutral-200">
            {fileName ?? "No file selected"}
          </p>
        </div>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words bg-black/40 p-3 font-mono text-xs">
          {fileContent || "Select a file to preview its contents."}
        </pre>
      </div>
    </div>
  );
}
