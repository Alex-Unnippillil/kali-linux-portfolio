'use client';

import React, { useMemo, useState, useId } from 'react';
import PayloadCatalog from '../../components/apps/xss-playground/PayloadCatalog';
import type { PayloadDefinition, PayloadGroup } from '../../components/apps/xss-playground/payloads';

interface SinkHarness {
  id: string;
  label: string;
  context: string;
  sinkType: string;
  description: string;
  effect: string;
  placeholder: string;
  sampleCode: (payload: string) => string;
}

interface SelectedPayloadMeta {
  groupId: string;
  groupTitle: string;
  payload: PayloadDefinition;
}

const sinkHarnesses: SinkHarness[] = [
  {
    id: 'dom-inner-html',
    label: 'DOM innerHTML',
    context: 'HTML fragment',
    sinkType: 'element.innerHTML',
    description:
      'Simulates writing untrusted HTML directly into the DOM via innerHTML or document.write without escaping.',
    effect:
      'Any scripts or event handlers in the fragment could execute immediately when a vulnerable application renders it.',
    placeholder: '<img src="x" onerror="alert(\'xss\')">',
    sampleCode: (payload) => {
      const serialized = JSON.stringify(payload || '<payload>');
      return [
        '// userInput arrives from an untrusted source',
        `const userInput = ${serialized};`,
        "const container = document.getElementById('preview');",
        'container.innerHTML = userInput;',
      ].join('\n');
    },
  },
  {
    id: 'attribute-href',
    label: 'Link href attribute',
    context: 'URL attribute',
    sinkType: 'element.href',
    description:
      'Demonstrates assigning untrusted input to an anchor href attribute without protocol filtering.',
    effect:
      'If the value begins with javascript: or a data URI it can execute code when the link is clicked.',
    placeholder: 'javascript:alert(document.domain)',
    sampleCode: (payload) => {
      const serialized = JSON.stringify(payload || 'javascript:alert(1)');
      return [
        '// developer expects a normal URL',
        `const userInput = ${serialized};`,
        "const link = document.querySelector('a.preview-link');",
        'link.href = userInput;',
        "link.textContent = userInput;",
      ].join('\n');
    },
  },
  {
    id: 'script-template',
    label: 'Inline script template',
    context: 'Script string literal',
    sinkType: 'string interpolation',
    description:
      'Shows what happens when untrusted data is interpolated inside an inline <script> block string.',
    effect:
      'Breaking out of the string lets the payload run code before the legitimate script continues executing.',
    placeholder: '";alert(\'xss\');//',
    sampleCode: (payload) => {
      const serialized = JSON.stringify(payload || "\";alert('xss');//");
      return [
        '// templating inside a <script> tag',
        `const userInput = ${serialized};`,
        'const script = `const message = "${userInput}";`;',
        'eval(script); // vulnerable pattern',
      ].join('\n');
    },
  },
];

const createInitialState = <T,>(value: T) => {
  const initial: Record<string, T> = {};
  for (const sink of sinkHarnesses) {
    initial[sink.id] = value;
  }
  return initial;
};

const XssPlayground: React.FC = () => {
  const payloadInputId = useId();
  const [activeSinkId, setActiveSinkId] = useState<string>(sinkHarnesses[0].id);
  const [payloadValues, setPayloadValues] = useState<Record<string, string>>(() =>
    createInitialState(''),
  );
  const [payloadMeta, setPayloadMeta] = useState<Record<string, SelectedPayloadMeta | null>>(() =>
    createInitialState<SelectedPayloadMeta | null>(null),
  );
  const [announcement, setAnnouncement] = useState('');

  const activeSink = useMemo(
    () => sinkHarnesses.find((sink) => sink.id === activeSinkId) ?? sinkHarnesses[0],
    [activeSinkId],
  );

  const activePayloadValue = payloadValues[activeSink.id] ?? '';
  const activePayloadMeta = payloadMeta[activeSink.id] ?? null;
  const sinkDescriptionId = `sink-${activeSink.id}-description`;
  const selectedPayloadId = activePayloadMeta
    ? `selected-payload-${activeSink.id}`
    : undefined;
  const describedBy = [sinkDescriptionId, selectedPayloadId].filter(Boolean).join(' ');

  const updatePayloadValue = (value: string) => {
    setPayloadValues((prev) => ({ ...prev, [activeSink.id]: value }));
    setPayloadMeta((prev) => ({ ...prev, [activeSink.id]: null }));
    setAnnouncement('');
  };

  const handlePayloadSelect = (payload: PayloadDefinition, group: PayloadGroup) => {
    const sinkLabel = `${activeSink.label} harness`;
    setPayloadValues((prev) => ({ ...prev, [activeSink.id]: payload.snippet }));
    setPayloadMeta((prev) => ({
      ...prev,
      [activeSink.id]: {
        groupId: group.id,
        groupTitle: group.title,
        payload,
      },
    }));

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(payload.snippet)
        .then(() =>
          setAnnouncement(
            `Copied "${payload.title}" into the clipboard and filled the ${sinkLabel}.`,
          ),
        )
        .catch(() =>
          setAnnouncement(
            `Filled the ${sinkLabel} with "${payload.title}". Unable to copy automatically.`,
          ),
        );
    } else {
      setAnnouncement(`Filled the ${sinkLabel} with "${payload.title}".`);
    }
  };

  const vulnerableSnippet = activeSink.sampleCode(activePayloadValue);

  return (
    <div className="flex h-full min-h-screen flex-col bg-gray-950 text-white lg:flex-row">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold">XSS Playground</h1>
            <p className="text-sm text-gray-300">
              Experiment with common cross-site scripting payloads in a safe harness. Select a sink to
              see how untrusted input moves through different vulnerable patterns.
            </p>
          </header>

          <nav
            role="tablist"
            aria-label="XSS sink harnesses"
            className="flex flex-wrap gap-2"
          >
            {sinkHarnesses.map((sink) => {
              const isActive = sink.id === activeSink.id;
              return (
                <button
                  key={sink.id}
                  type="button"
                  role="tab"
                  id={`${sink.id}-tab`}
                  aria-selected={isActive}
                  aria-controls={`${sink.id}-panel`}
                  onClick={() => {
                    setActiveSinkId(sink.id);
                    setAnnouncement('');
                  }}
                  className={`rounded px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                  }`}
                  title={`${sink.context} via ${sink.sinkType}`}
                >
                  {sink.label}
                </button>
              );
            })}
          </nav>

          <section
            id={`${activeSink.id}-panel`}
            role="tabpanel"
            aria-labelledby={`${activeSink.id}-tab`}
            className="space-y-4 rounded-lg border border-gray-800 bg-gray-900/60 p-4"
          >
            <div
              id={sinkDescriptionId}
              className="rounded-lg border border-gray-800 bg-black/40 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-gray-400">Active sink</p>
              <p className="text-lg font-semibold text-white">{activeSink.label}</p>
              <p className="text-xs text-gray-400">
                {activeSink.context} • {activeSink.sinkType}
              </p>
              <p className="mt-2 text-sm text-gray-300">{activeSink.description}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor={payloadInputId} className="text-sm font-medium text-white">
                Harness input
              </label>
              <textarea
                id={payloadInputId}
                value={activePayloadValue}
                onChange={(event) => updatePayloadValue(event.target.value)}
                placeholder={activeSink.placeholder}
                aria-describedby={describedBy || undefined}
                className="min-h-[120px] w-full rounded-lg border border-gray-800 bg-black/40 p-3 font-mono text-sm text-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              />
              <p className="text-xs text-gray-400">
                Payloads inserted here are simulated; nothing is ever executed against another site.
              </p>
            </div>

            {activePayloadMeta && (
              <div
                id={selectedPayloadId}
                className="rounded-lg border border-blue-500/40 bg-blue-900/20 p-3 text-xs text-blue-100"
              >
                <p className="font-semibold text-blue-100">{activePayloadMeta.payload.title}</p>
                <p className="mt-1 text-blue-200">{activePayloadMeta.payload.description}</p>
                <p className="mt-1 text-blue-300">
                  Group: {activePayloadMeta.groupTitle} • {activePayloadMeta.payload.context} via{' '}
                  {activePayloadMeta.payload.sinkType}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-200">Vulnerable snippet</h2>
              <pre className="max-h-64 overflow-auto rounded bg-black/60 p-3 font-mono text-xs text-green-300">
                {vulnerableSnippet}
              </pre>
              <h2 className="text-sm font-semibold text-gray-200">Simulated output</h2>
              <div className="rounded bg-black/40 p-3">
                {activePayloadValue ? (
                  <code className="block whitespace-pre-wrap break-words font-mono text-green-300">
                    {activePayloadValue}
                  </code>
                ) : (
                  <p className="text-xs text-gray-500">Provide a payload to preview it here.</p>
                )}
              </div>
              <p className="text-xs text-gray-400">{activeSink.effect}</p>
            </div>
          </section>

          <div role="status" aria-live="polite" className="text-xs text-emerald-300">
            {announcement}
          </div>
        </div>
      </div>
      <PayloadCatalog
        className="lg:w-96"
        activeSinkLabel={activeSink.label}
        onPayloadSelect={handlePayloadSelect}
      />
    </div>
  );
};

export default XssPlayground;
