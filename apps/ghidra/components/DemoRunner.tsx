'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import GhidraApp from '../../../components/apps/ghidra';

const createTone = (primary: string) => ({
  primary,
  secondary: `color-mix(in srgb, ${primary} 38%, var(--kali-text) 62%)`,
  tertiary: `color-mix(in srgb, ${primary} 24%, var(--kali-text) 76%)`,
  badgeBg: `color-mix(in srgb, ${primary} 18%, transparent)`,
  badgeBorder: `color-mix(in srgb, ${primary} 52%, transparent)`,
  shadow: `color-mix(in srgb, ${primary} 32%, rgba(5, 10, 20, 0.65))`,
  spinnerRing: `color-mix(in srgb, ${primary} 70%, rgba(255, 255, 255, 0.3))`,
});

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
    const tone = status === 'error'
      ? createTone('var(--color-severity-high)')
      : status === 'missing'
        ? createTone('var(--color-severity-medium)')
        : createTone('var(--kali-control)');
    const badgeLabel = isLoading
      ? 'Loading environment'
      : status === 'error'
        ? 'Runtime error'
        : 'Configuration required';

    return (
      <div className="flex w-full justify-center">
        <div className="flex w-full max-w-xl flex-col items-center space-y-6 rounded-2xl border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel)]/95 p-6 text-center shadow-[0_24px_64px_rgba(5,10,20,0.65)] backdrop-blur-lg">
          <Image
            src="/themes/Yaru/apps/ghidra.svg"
            width={192}
            height={192}
            alt="Ghidra Web preview placeholder"
            style={{ filter: `drop-shadow(0 8px 32px ${tone.shadow})` }}
          />
          <div className="space-y-3">
            <span
              className="inline-flex items-center justify-center rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.28em]"
              style={{
                color: tone.primary,
                backgroundColor: tone.badgeBg,
                border: `1px solid ${tone.badgeBorder}`,
                boxShadow: `0 0 0 1px ${tone.badgeBorder}`,
              }}
            >
              {badgeLabel}
            </span>
            <h2 className="text-2xl font-semibold" style={{ color: tone.primary }}>
              Ghidra Web Preview
            </h2>
            <p className="text-sm" style={{ color: tone.secondary }}>
              {description}
            </p>
            {status === 'missing' ? (
              <p className="text-xs" style={{ color: tone.tertiary }}>
                Provide the URL to your compiled{' '}
                <code className="font-mono text-[color:var(--color-severity-medium)]">ghidra.wasm</code> bundle and press
                Retry once it is reachable.
              </p>
            ) : null}
          </div>
          {isLoading ? (
            <div
              className="flex flex-col items-center space-y-2 text-xs font-semibold uppercase tracking-wide"
              role="status"
              aria-live="polite"
              style={{ color: tone.secondary }}
            >
              <div
                className="h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
                style={{ borderColor: tone.spinnerRing, borderTopColor: 'transparent' }}
              />
              <span
                className="inline-flex items-center justify-center rounded-full px-3 py-1"
                style={{
                  color: 'var(--kali-bg)',
                  backgroundColor: tone.primary,
                  boxShadow: `0 8px 20px ${tone.shadow}`,
                }}
              >
                Preparing WebAssembly runtime…
              </span>
              <span className="sr-only">Loading Ghidra WebAssembly module</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kali-control)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--kali-panel)]"
              style={{
                backgroundColor: 'var(--kali-control)',
                color: 'var(--kali-bg)',
                boxShadow: `0 12px 32px ${tone.shadow}`,
              }}
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
