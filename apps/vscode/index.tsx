"use client";

import { useEffect, useRef, useState } from "react";
import WebPreview from "./components/WebPreview";

const PROJECT = "demo";

async function saveProject(code: string) {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle("vscode", { create: true });
    const proj = await dir.getDirectoryHandle(PROJECT, { create: true });
    const file = await proj.getFileHandle("settings.json", { create: true });
    const writable = await file.createWritable();
    await writable.write(JSON.stringify({ code }));
    await writable.close();
  } catch {}
}

async function loadProject(): Promise<string | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const dir = await root.getDirectoryHandle("vscode");
    const proj = await dir.getDirectoryHandle(PROJECT);
    const file = await proj.getFileHandle("settings.json");
    const data = await file.getFile();
    const text = await data.text();
    return (JSON.parse(text) as { code: string }).code;
  } catch {
    return null;
  }
}

export default function VsCode() {
  const [code, setCode] = useState("");
  const [lint, setLint] = useState<{ line: number; message: string }[]>([]);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [preview, setPreview] = useState("");
  const lintWorker = useRef<Worker>();

  useEffect(() => {
    loadProject().then(async (saved) => {
      if (saved) setCode(saved);
      else {
        const res = await fetch("/data/vscode-example/main.js");
        const sample = await res.text();
        setCode(sample);
        saveProject(sample);
      }
    });

    lintWorker.current = new Worker(
      new URL("../../workers/webLints.worker.ts", import.meta.url),
      { type: "module" },
    );

    lintWorker.current.onmessage = (e) => {
      if (e.data.type === "format") setCode(e.data.formatted);
      if (e.data.type === "lint") setLint(e.data.messages);
    };

    return () => {
      lintWorker.current?.terminate();
    };
  }, []);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCode(val);
    saveProject(val);
  };

  const format = () =>
    lintWorker.current?.postMessage({ type: "format", code });
  const lintCodeFn = () =>
    lintWorker.current?.postMessage({ type: "lint", code });
  const run = () => {
    setConsoleOutput([]);
    const hasHtml = /<\/?(html|body|script)/i.test(code);
    const html = hasHtml ? code : `<script>${code}</script>`;
    setPreview(html);
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex space-x-2 p-2 bg-gray-200">
        <button className="px-2 py-1 bg-white rounded" onClick={format}>
          Format
        </button>
        <button className="px-2 py-1 bg-white rounded" onClick={lintCodeFn}>
          Lint
        </button>
        <button className="px-2 py-1 bg-white rounded" onClick={run}>
          Run
        </button>
      </div>
      <div className="flex flex-1">
        <textarea
          value={code}
          onChange={onChange}
          className="flex-1 font-mono p-2"
        />
        <WebPreview
          code={preview}
          onConsole={(m) => setConsoleOutput((prev) => [...prev, m])}
        />
      </div>
      <div className="h-40 overflow-auto border-t text-sm p-2 bg-black text-green-400 font-mono">
        {lint.map((m, i) => (
          <div key={i}>{`Line ${m.line}: ${m.message}`}</div>
        ))}
        {consoleOutput.map((m, i) => (
          <div key={`c${i}`}>{m}</div>
        ))}
      </div>
    </div>
  );
}
