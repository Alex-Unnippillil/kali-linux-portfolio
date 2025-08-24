'use client';

import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import safeRegex from 'safe-regex';

const MAX_LEN = 1000;

interface Example {
  pattern: string;
  text: string;
  explanation: string;
}

const examples: Example[] = [
  {
    pattern: '^(a+)+$',
    text: 'aaaaaaaaaaaaaaaaaaaa!',
    explanation: 'Nested quantifiers cause catastrophic backtracking.',
  },
  {
    pattern: '(a|aa)+$',
    text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
    explanation: 'Ambiguous alternation triggers extensive backtracking.',
  },
];

const PcreRe2Lab: React.FC = () => {
  const [pattern, setPattern] = useState('');
  const [text, setText] = useState('');
  const [re2Time, setRe2Time] = useState(0);
  const [re2Result, setRe2Result] = useState<string[]>([]);
  const [pcreTime, setPcreTime] = useState(0);
  const [pcreResult, setPcreResult] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [usePcre, setUsePcre] = useState(false);
  const [unsafe, setUnsafe] = useState(false);
  const workerRef = useRef<Worker>();
  const editorRef = useRef<any>();
  const monacoRef = useRef<any>();

  useEffect(() => {
    workerRef.current = new Worker(new URL('./regex-worker.ts', import.meta.url));
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { engine, event, match, matches, time, error } = e.data;
      if (engine === 're2') {
        if (event === 'match') {
          setRe2Result((m) => [...m, match]);
        } else if (event === 'done' || event === 'timeout') {
          setRe2Time(time || 0);
          if (error) setMsg((m) => m + ` RE2: ${error}`);
          if (event === 'timeout') setMsg((m) => m + ' RE2 timed out.');
        }
      } else {
        if (event === 'match') {
          setPcreResult((m) => [...m, match]);
        } else if (event === 'done' || event === 'timeout') {
          setPcreTime(time || 0);
          if (error) setMsg((m) => m + ` PCRE2: ${error}`);
          if (event === 'timeout') setMsg((m) => m + ' PCRE2 timed out.');
        }
      }
    };
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    const t = params.get('t');
    if (p) setPattern(decodeURIComponent(p));
    if (t) setText(decodeURIComponent(t));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (pattern) params.set('p', encodeURIComponent(pattern));
    if (text) params.set('t', encodeURIComponent(text));
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
  }, [pattern, text]);

  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      const markers = safeRegex(pattern)
        ? []
        : [
            {
              startLineNumber: 1,
              startColumn: 1,
              endLineNumber: 1,
              endColumn: pattern.length + 1,
              message: 'Potential ReDoS pattern',
              severity: monacoRef.current.MarkerSeverity.Warning,
            },
          ];
      monacoRef.current.editor.setModelMarkers(
        editorRef.current.getModel(),
        'lint',
        markers
      );
    }
    setUnsafe(!safeRegex(pattern));
  }, [pattern]);

  const run = () => {
    const limited = text.slice(0, MAX_LEN);
    if (limited !== text) setText(limited);
    setRe2Result([]);
    setPcreResult([]);
    setMsg('');
    workerRef.current?.postMessage({ pattern, text: limited, engine: 're2' });
    if (usePcre) {
      workerRef.current?.postMessage({ pattern, text: limited, engine: 'pcre' });
    }
  };

  useEffect(() => {
    const cb = () => run();
    const id =
      (window as any).requestIdleCallback
        ? (window as any).requestIdleCallback(cb)
        : setTimeout(cb, 0);
    return () => {
      if ((window as any).cancelIdleCallback) {
        (window as any).cancelIdleCallback(id);
      } else {
        clearTimeout(id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pattern, text, usePcre]);

  const togglePcre = () => {
    if (!usePcre && !window.confirm('PCRE2 may be vulnerable to ReDoS. Continue?'))
      return;
    setUsePcre((v) => !v);
  };

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col space-y-2">
      <div className="flex space-x-2 items-center">
        <div className="flex-1">
          <Editor
            height="40px"
            defaultLanguage="regex"
            value={pattern}
            onChange={(v) => setPattern(v || '')}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              monacoRef.current = monaco;
            }}
          />
        </div>
        <button className="px-2 py-1 bg-gray-700 rounded" onClick={togglePcre}>
          {usePcre ? 'Disable PCRE2' : 'Enable PCRE2'}
        </button>
        <button className="px-2 py-1 bg-blue-700 rounded" onClick={share}>
          Share
        </button>
      </div>
      <textarea
        className="w-full h-32 p-2 text-black rounded font-mono"
        placeholder="Test text"
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
      />
      {unsafe && <div className="text-yellow-400">Potential ReDoS pattern</div>}
      {msg && <div className="text-red-500 whitespace-pre-wrap">{msg}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-auto">
        <div>
          <h3 className="font-bold">RE2 (WASM)</h3>
          <div>Time: {re2Time.toFixed(3)} ms</div>
          <pre className="bg-gray-800 p-2 rounded overflow-auto whitespace-pre-wrap">
            {JSON.stringify(re2Result)}
          </pre>
        </div>
        {usePcre && (
          <div>
            <h3 className="font-bold">PCRE2 (WASM)</h3>
            <div>Time: {pcreTime.toFixed(3)} ms</div>
            <pre className="bg-gray-800 p-2 rounded overflow-auto whitespace-pre-wrap">
              {JSON.stringify(pcreResult)}
            </pre>
          </div>
        )}
      </div>
      <details className="bg-gray-800 p-2 rounded">
        <summary className="cursor-pointer">ReDoS examples</summary>
        <ul className="space-y-1 mt-2">
          {examples.map((ex, i) => (
            <li key={i}>
              <button
                className="underline text-blue-400"
                onClick={() => {
                  setPattern(ex.pattern);
                  setText(ex.text);
                }}
              >
                {ex.pattern}
              </button>{' '}
              - {ex.explanation}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
};

export default PcreRe2Lab;

export const displayPcreRe2Lab = () => <PcreRe2Lab />;

