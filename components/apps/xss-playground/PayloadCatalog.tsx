'use client';

import React, { useId } from 'react';
import type { PayloadDefinition, PayloadGroup } from './payloads';
import { payloadGroups } from './payloads';

interface PayloadCatalogProps {
  activeSinkLabel: string;
  onPayloadSelect: (payload: PayloadDefinition, group: PayloadGroup) => void;
  className?: string;
}

const PayloadCatalog: React.FC<PayloadCatalogProps> = ({
  activeSinkLabel,
  onPayloadSelect,
  className,
}) => {
  const headingId = useId();

  return (
    <aside
      role="complementary"
      aria-labelledby={headingId}
      className={`bg-gray-950 text-white border-t border-gray-800 lg:border-t-0 lg:border-l ${className ?? ''}`}
    >
      <div className="sticky top-0 z-10 border-b border-gray-800 bg-gray-950/95 px-4 py-3 backdrop-blur">
        <h2 id={headingId} className="text-lg font-semibold">
          Payload catalog
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          Choose a payload to copy it to your clipboard and populate the active harness input.
        </p>
      </div>
      <div className="max-h-full overflow-y-auto px-4 py-4 space-y-6">
        {payloadGroups.map((group) => (
          <section key={group.id} aria-labelledby={`${group.id}-heading`} className="space-y-3">
            <header>
              <h3
                id={`${group.id}-heading`}
                className="text-sm font-semibold uppercase tracking-wide text-gray-300"
              >
                {group.title}
              </h3>
              <p className="mt-1 text-xs text-gray-400">{group.description}</p>
            </header>
            <ul className="space-y-3">
              {group.payloads.map((payload) => (
                <li
                  key={payload.id}
                  className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 shadow-sm transition hover:border-blue-500"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{payload.title}</p>
                      <p className="text-xs text-gray-400">
                        {payload.context} • {payload.sinkType}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPayloadSelect(payload, group)}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                      aria-label={`Copy payload "${payload.title}" for ${payload.context} using ${payload.sinkType} and fill the ${activeSinkLabel} harness input.`}
                      title={`${payload.title} — ${payload.context} via ${payload.sinkType}`}
                    >
                      Copy &amp; Fill
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-300">{payload.description}</p>
                  <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-black/60 p-2 font-mono text-xs text-green-300">
                    {payload.snippet}
                  </pre>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </aside>
  );
};

export default PayloadCatalog;
