"use client";

import { getPageMetadata } from '@/lib/metadata';
import Image from 'next/image';
import React, { useState } from 'react';
export const metadata = getPageMetadata('/hook-flow');

const HookFlow: React.FC = () => {
  const [consented, setConsented] = useState(false);

  if (!consented) {
    return (
      <main className="p-4 text-center">
        <p className="mb-4 font-bold">
          This page contains diagrams and links to external documentation.
        </p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => setConsented(true)}
        >
          Continue
        </button>
      </main>
    );
  }

  return (
    <main className="p-4 space-y-4">
      <Image
        src="/hook-flow.svg"
        alt="React hook flow diagram"
        width={420}
        height={120}
        sizes="(max-width: 420px) 100vw, 420px"
        className="mx-auto"
      />
      <iframe
        title="React Hooks Documentation"
        src="https://react.dev/learn/hooks"
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-96 border"
      />
    </main>
  );
};

export default HookFlow;
