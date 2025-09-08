'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const GhidraApp = dynamic(() => import('../../../components/apps/ghidra'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function DemoRunner() {
  const wrapperUrl = process.env.NEXT_PUBLIC_GHIDRA_WASM;
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!wrapperUrl) {
      return;
    }
    let mounted = true;
    import(/* webpackIgnore: true */ wrapperUrl)
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
  }, [wrapperUrl]);

  if (!enabled) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <Image
          src="/themes/Yaru/apps/ghidra.svg"
          width={256}
          height={256}
          alt="Ghidra screenshot 1"
        />
        <Image
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
