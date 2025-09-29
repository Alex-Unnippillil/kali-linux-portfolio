import React, { useState } from 'react';
import ExplainerPane from '../ExplainerPane';
import WarningBanner from '../WarningBanner';

type Resource = {
  label: string;
  url: string;
};

type NetworkAttackStepProps = {
  title: string;
  instructions: string[];
  displayedCommand: string;
  simulatedCommand: string;
  learnMoreLines?: string[];
  resources?: Resource[];
};

const SIMULATION_WARNING =
  'Training simulation only. These walkthrough steps are for education and never execute or share real offensive payloads.';

export default function NetworkAttackStep({
  title,
  instructions,
  displayedCommand,
  simulatedCommand,
  learnMoreLines = [],
  resources = [],
}: NetworkAttackStepProps) {
  const [copyState, setCopyState] = useState<'idle' | 'success' | 'error'>('idle');
  const [showExplainer, setShowExplainer] = useState(false);

  const hasExplainer = learnMoreLines.length > 0 || resources.length > 0;

  const handleCopy = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyState('error');
      return;
    }

    try {
      await navigator.clipboard.writeText(simulatedCommand);
      setCopyState('success');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
    }
  };

  return (
    <section className="space-y-4 text-xs" aria-label="network attack simulation step">
      <WarningBanner>{SIMULATION_WARNING}</WarningBanner>

      <header>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </header>

      <div>
        <p className="mb-2 font-semibold text-white">Step overview</p>
        <ol className="list-decimal list-inside space-y-1 text-ubt-grey">
          {instructions.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ol>
      </div>

      <div className="bg-black text-green-400 font-mono rounded p-3" aria-live="polite">
        <div className="flex items-start gap-2">
          <pre className="flex-1 whitespace-pre-wrap text-xs">{displayedCommand}</pre>
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-1 text-black bg-ubt-blue rounded text-[11px] font-semibold"
            aria-label="copy simulated command"
          >
            Copy simulated command
          </button>
        </div>
        <p className="mt-2 text-[10px] text-ubt-grey" aria-live="assertive">
          {copyState === 'success' && 'Simulated command copied to clipboard.'}
          {copyState === 'error' && 'Clipboard unavailable. Review the redacted command above.'}
        </p>
      </div>

      {hasExplainer && (
        <div className="border border-ub-cool-grey rounded">
          <button
            type="button"
            onClick={() => setShowExplainer((value) => !value)}
            className="w-full text-left px-3 py-2 flex items-center justify-between text-white bg-ubt-gray"
            aria-expanded={showExplainer}
            aria-controls="network-step-explainer"
          >
            <span>Learn more</span>
            <span aria-hidden>{showExplainer ? '−' : '+'}</span>
          </button>
          {showExplainer && (
            <div id="network-step-explainer" className="bg-black/50">
              <ExplainerPane lines={learnMoreLines} resources={resources} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
