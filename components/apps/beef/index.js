import React, { useState } from 'react';
import PayloadBuilder from '../../../apps/beef/components/PayloadBuilder';
import ModuleGallery from './ModuleGallery';

export default function Beef() {
  const targetPage = `\n<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="utf-8"/>\n  <title>Sandboxed Target</title>\n</head>\n<body>\n  <h1>Sandboxed Target Page</h1>\n  <p>This page is isolated and cannot make network requests.</p>\n  <script>document.body.append(' - loaded');<\/script>\n</body>\n</html>`;

  const steps = [
    {
      title: 'Disclaimer',
      body:
        'Use these security tools only in environments where you have explicit authorization. Unauthorized testing is illegal.',
      action: 'Begin',
    },
    {
      title: 'Sandboxed Target',
      body: 'The iframe below hosts an isolated page for demonstration. It runs entirely locally.',
      render: (
        <iframe
          title="sandbox"
          className="w-full h-48 border"
          sandbox=""
          srcDoc={targetPage}
        />
      ),
      action: 'Next',
    },
    {
      title: 'Simulated Hook',
      body: 'The target has been locally “hooked”. No packets left this machine.',
      action: 'Next',
    },
    {
      title: 'Module Gallery',
      body:
        'Browse grouped BeEF modules and trigger sandboxed demos. The animations below stream deterministic output representing each module’s effect.',
      render: <ModuleGallery />,
      action: 'Next',
    },
    {
      title: 'Payload Builder',
      body: 'Craft benign payload pages. Copy or preview the generated HTML locally.',
      render: <PayloadBuilder />,
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
        For educational use only. No network calls occur during this demo.
      </p>
    </div>
  );
}
