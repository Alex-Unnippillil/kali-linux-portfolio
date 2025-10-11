'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import GhidraApp from '../../../components/apps/ghidra';

type DemoStatus = 'loading' | 'ready' | 'error' | 'missing';

export default function DemoRunner() {
  const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM;
  const [status, setStatus] = useState<DemoStatus>(wasmUrl ? 'loading' : 'missing');
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const instantiateModule = useCallback(async () => {
    if (!mountedRef.current) {
      return;
    }

    if (!wasmUrl) {
      setStatus('missing');
      return;
    }

    setStatus('loading');

    try {
      if (typeof WebAssembly.instantiateStreaming === 'function') {
        await WebAssembly.instantiateStreaming(fetch(wasmUrl), {});
      } else {
        const response = await fetch(wasmUrl);
        const wasmBytes = await response.arrayBuffer();
        await WebAssembly.instantiate(wasmBytes, {});
      }
      if (mountedRef.current) {
        setStatus('ready');
      }
    } catch (error) {
      if (mountedRef.current) {
        setStatus('error');
      }
    }
  }, [wasmUrl]);

  useEffect(() => {
    mountedRef.current = true;
    instantiateModule();
  }, [instantiateModule]);

  const handleRetry = useCallback(() => {
    instantiateModule();
  }, [instantiateModule]);

  if (status !== 'ready') {
    const isLoading = status === 'loading';
    const description =
      status === 'error'
        ? 'We could not initialize the WebAssembly sandbox. Double-check the hosted file and try again.'
        : 'This preview requires the hosted Ghidra WebAssembly bundle to be exposed through NEXT_PUBLIC_GHIDRA_WASM.';

    return (
      <div className="flex w-full justify-center">
        <div className="flex w-full max-w-xl flex-col items-center space-y-6 rounded-2xl border border-orange-500/30 bg-slate-950/60 p-6 text-center shadow-xl backdrop-blur">
          <Image
            src="/themes/Yaru/apps/ghidra.svg"
            width={192}
            height={192}
            alt="Ghidra Web preview placeholder"
            className="drop-shadow-[0_8px_32px_rgba(249,115,22,0.35)]"
          />
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-orange-100">Ghidra Web Preview</h2>
            <p className="text-sm text-orange-50/80">{description}</p>
            {status === 'missing' ? (
              <p className="text-xs text-orange-100/60">
                Provide the URL to your compiled <code className="font-mono text-orange-100">ghidra.wasm</code> bundle and press
                Retry once it is reachable.
              </p>
            ) : null}
          </div>
          {isLoading ? (
            <div className="flex flex-col items-center space-y-2 text-orange-100/70" role="status" aria-live="polite">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500/70 border-t-transparent" />
              <span className="text-xs font-semibold uppercase tracking-wide">Preparing WebAssembly runtime…</span>
              <span className="sr-only">Loading Ghidra WebAssembly module</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Retry setup
            </button>
          )}
        </div>
      </div>
    );
  }

  return <GhidraApp />;
}
