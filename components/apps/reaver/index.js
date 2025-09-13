import React, { useState } from 'react';
import data from './data/handshakes.json';
import SmallArrow from '../../util-components/small_arrow';

const ReaverStepper = () => {
  const { handshakes, risks, defenses } = data;
  const messages = handshakes[0]?.messages || [];
  const [current, setCurrent] = useState(0);
  const isSummary = current >= messages.length;
  const direction =
    messages[current]?.from === 'Access Point' ? 'right' : 'left';
  const logMessages = messages.slice(0, Math.min(current + 1, messages.length));

  const next = () => setCurrent((c) => Math.min(messages.length, c + 1));
  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const restart = () => setCurrent(0);

  return (
    <div
      id="reaver-stepper"
      className="p-4 bg-ub-cool-grey text-white h-full overflow-y-auto"
    >
      <h1 className="text-2xl mb-4">EAPOL Handshake Explorer</h1>

      {!isSummary && (
        <div className="relative h-12 mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-500" />
          </div>
          <div
            key={current}
            className={`arrow absolute top-1/2 -translate-y-1/2 ${
              direction === 'right' ? 'arrow-right' : 'arrow-left'
            }`}
          >
            <SmallArrow angle={direction} />
          </div>
          <span className="absolute left-0 -top-6 text-xs">
            {messages[current].from}
          </span>
          <span className="absolute right-0 -top-6 text-xs">
            {messages[current].to}
          </span>
        </div>
      )}

      {isSummary ? (
        <div id="summary">
          <h2 className="text-xl mb-2">Risks &amp; Defenses</h2>
          <div className="mb-4">
            <h3 className="font-semibold">Risks</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Defenses</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {defenses.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl mb-2">
            {messages[current].step}: {messages[current].from} ➜ {messages[current].to}
          </h2>
          <p className="text-sm">{messages[current].description}</p>
        </div>
      )}

      <div className="mt-4 bg-black text-green-400 font-mono text-xs p-2 h-32 overflow-y-auto">
        {logMessages.map((m) => (
          <div key={m.step}>
            [{m.step}] {m.from} ➜ {m.to}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between print:hidden">
        <button
          onClick={prev}
          disabled={current === 0}
          className="px-4 py-2 bg-gray-700 rounded disabled:opacity-50"
        >
          Previous
        </button>
        {isSummary ? (
          <button
            onClick={restart}
            className="px-4 py-2 bg-ub-green text-black rounded"
          >
            Restart
          </button>
        ) : (
          <button
            onClick={next}
            className="px-4 py-2 bg-ub-green text-black rounded"
          >
            Next
          </button>
        )}
      </div>

      <style jsx>{`
        .arrow {
          width: 1rem;
          height: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .arrow-right {
          animation: move-right calc(var(--motion-enabled) * 1s) forwards;
        }
        .arrow-left {
          animation: move-left calc(var(--motion-enabled) * 1s) forwards;
        }
        @keyframes move-right {
          from {
            left: 0;
          }
          to {
            left: calc(100% - 1rem);
          }
        }
        @keyframes move-left {
          from {
            left: calc(100% - 1rem);
          }
          to {
            left: 0;
          }
        }
        @media print {
          #reaver-stepper {
            background: white;
            color: black;
          }
        }
      `}</style>
    </div>
  );
};

export default ReaverStepper;
