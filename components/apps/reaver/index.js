import React, { useState } from 'react';
import data from './data/handshakes.json';

const ReaverStepper = () => {
  const { handshakes, risks, defenses } = data;
  const messages = handshakes[0]?.messages || [];
  const [current, setCurrent] = useState(0);
  const isSummary = current >= messages.length;

  const next = () => setCurrent((c) => Math.min(messages.length, c + 1));
  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const restart = () => setCurrent(0);

  return (
    <div
      id="reaver-stepper"
      className="p-4 bg-ub-cool-grey text-white h-full overflow-y-auto"
    >
      <h1 className="text-2xl mb-4">EAPOL Handshake Explorer</h1>

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
