'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import GhidraApp from '../../../components/apps/ghidra';
import GhidraSkeleton from './GhidraSkeleton';
import SuspenseGate from '../../shared/SuspenseGate';

export default function DemoRunner() {
  const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM;
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'offline'>(
    wasmUrl ? 'loading' : 'offline'
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!wasmUrl) {
      setStatus('offline');
      return;
    }
    let active = true;
    setStatus('loading');
    startTransition(() => {
      WebAssembly.instantiateStreaming(fetch(wasmUrl), {})
        .then(() => {
          if (active) {
            setStatus('ready');
          }
        })
        .catch(() => {
          if (active) {
            setStatus('offline');
          }
        });
    });
    return () => {
      active = false;
    };
  }, [wasmUrl, startTransition]);

  const loading = status === 'loading' || pending;

  return (
    <Suspense fallback={<GhidraSkeleton />}>
      <SuspenseGate active={loading}>
        {status === 'ready' ? (
          <GhidraApp />
        ) : (
          <div className="flex flex-col items-center space-y-4 text-center text-sm text-gray-300">
            <Image
              src="/themes/Yaru/apps/ghidra.svg"
              width={256}
              height={256}
              alt="Ghidra offline preview"
              priority
            />
            <p>
              {status === 'offline'
                ? 'The interactive demo is unavailable offline. Static previews are shown instead.'
                : 'Preparing the interactive demo…'}
            </p>
          </div>
        )}
      </SuspenseGate>
    </Suspense>
  );
}
