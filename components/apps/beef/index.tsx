"use client";

import React, { useState } from 'react';
import HookLab from './HookLab';

export default function Beef() {

  const steps = [
    {
      title: 'Disclaimer',
      body:
        'Use these security tools only in environments where you have explicit authorization. Unauthorized testing is illegal.',
      action: 'Begin',
    },
    {
      title: 'Victim Page',
      body: 'The iframe below shows a static page. If NEXT_PUBLIC_BEEF_URL is set, it loads from that server; otherwise a local demo is used.',
      render: <HookLab />,
      action: 'Next',
    },
    {
      title: 'Simulated Hook',
      body: 'The target has been locally “hooked”. No packets left this machine.',
      action: 'Next',
    },
    {
      title: 'Run Demo Module',
      body: 'A deterministic module runs and prints output below.',
      render: (
        <pre className="bg-black text-white p-2 text-xs rounded">{`Demo module executed\nResult: success`}</pre>
      ),
      action: 'Next',
    },
    {
      title: 'Complete',
      body: 'The lab sequence is finished. Reset to clear all data.',
      action: 'Reset Lab',
      final: true,
    },
  ];

  const [step, setStep] = useState(0);

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const resetLab = () => {
    try {
      localStorage.removeItem('beef-lab-ok');
    } catch {
      // ignore
    }
    setStep(0);
  };

  const current = steps[step];

  return (
    <div className="p-4 text-white bg-ub-cool-grey h-full w-full flex flex-col">
      <h2 className="text-xl mb-4">{current.title}</h2>
      <p className="mb-4 text-sm">{current.body}</p>
      {current.render && <div className="mb-4">{current.render}</div>}
      <button
        type="button"
        onClick={current.final ? resetLab : next}
        className="self-start px-3 py-1 bg-ub-primary text-white rounded"
      >
        {current.action}
      </button>
      <p className="mt-4 text-xs">
        For educational use only. Local demo avoids network requests.
      </p>
    </div>
  );
}
