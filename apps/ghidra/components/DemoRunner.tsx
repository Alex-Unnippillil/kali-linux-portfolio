'use client';

import { useEffect, useState } from 'react';
import GhidraApp from '../../../components/apps/ghidra';
import SmartImage from '../../../components/util-components/SmartImage';

export default function DemoRunner() {
  const wasmUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!wasmUrl) {
      return;
    }
    let mounted = true;
    WebAssembly.instantiateStreaming(fetch(wasmUrl), {})
      .then(() => {
        if (mounted) {
          setEnabled(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setEnabled(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [wasmUrl]);

  if (!enabled) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <SmartImage
          src="/themes/Yaru/apps/ghidra.svg"
          width={256}
          height={256}
          alt="Ghidra screenshot 1"
        />
        <SmartImage
          src="/themes/Yaru/apps/ghidra.svg"
          width={256}
          height={256}
          alt="Ghidra screenshot 2"
        />
      </div>
    );
  }

  return <GhidraApp />;
}
