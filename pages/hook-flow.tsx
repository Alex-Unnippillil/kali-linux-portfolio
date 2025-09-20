"use client";

import Image from 'next/image';
import React, { useState } from 'react';

const HookFlow: React.FC = () => {
  const [consented, setConsented] = useState(false);

  if (!consented) {
    return (
      <section
        aria-labelledby="hook-flow-consent-heading"
        className="p-4 text-center"
      >
        <h1 id="hook-flow-consent-heading" className="mb-4 font-bold">
          View React hook flow diagram
        </h1>
        <p className="mb-4">
          This page contains diagrams and links to external documentation.
        </p>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => setConsented(true)}
        >
          Continue
        </button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="hook-flow-heading"
      className="p-4 space-y-4"
    >
      <h1 id="hook-flow-heading" className="text-2xl font-semibold">
        React hook flow reference
      </h1>
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
    </section>
  );
};

export default HookFlow;
