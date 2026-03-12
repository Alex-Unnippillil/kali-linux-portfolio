import React, { useEffect, useMemo, useState } from 'react';
import data from './data/handshakes.json';
import SmallArrow from '../../util-components/small_arrow';

const buildInitialCommandState = (handshake) => {
  if (!handshake?.commandTemplates) return {};
  return handshake.commandTemplates.reduce((acc, template) => {
    acc[template.id] = (template.inputs || []).reduce((inputAcc, input) => {
      inputAcc[input.name] = input.default || '';
      return inputAcc;
    }, {});
    return acc;
  }, {});
};

const substituteTemplate = (template, values = {}) => {
  if (!template) return '';
  return template.replace(/\{(.*?)\}/g, (_, key) => {
    const value = values[key];
    return value === undefined || value === null || value === ''
      ? `{${key}}`
      : value;
  });
};

const ReaverStepper = () => {
  const { handshakes = [], risks = [], defenses = [], globalWarnings = [] } = data;
  const [selectedId, setSelectedId] = useState(handshakes[0]?.id || '');
  const handshake = useMemo(
    () => handshakes.find((item) => item.id === selectedId) || handshakes[0],
    [handshakes, selectedId],
  );
  const [commandInputs, setCommandInputs] = useState(
    buildInitialCommandState(handshakes[0]),
  );

  useEffect(() => {
    setCommandInputs(buildInitialCommandState(handshake));
  }, [handshake]);

  const messages = handshake?.messages || [];
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    setCurrent(0);
  }, [selectedId, messages.length]);

  const isSummary = current >= messages.length;
  const activeMessage = messages[current];
  const direction =
    activeMessage?.from === 'Access Point' ? 'right' : 'left';
  const logMessages = messages.slice(0, Math.min(current + 1, messages.length));

  const next = () => setCurrent((c) => Math.min(messages.length, c + 1));
  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const restart = () => setCurrent(0);

  return (
    <div
      id="reaver-stepper"
      className="p-4 h-full overflow-y-auto bg-kali-surface text-kali-text"
    >
      <h1 className="text-2xl mb-1">Reaver Handshake Lab</h1>
      <p className="text-xs text-yellow-300 mb-4">
        Simulated Wi-Fi lab. Commands are wrapped with <code>printf</code> so
        nothing transmits.
      </p>

      {globalWarnings.length > 0 && (
        <div className="mb-4 bg-gray-800 border border-yellow-600 p-3 rounded text-xs space-y-1">
          {globalWarnings.map((warning) => (
            <p key={warning} className="text-yellow-200">
              {warning}
            </p>
          ))}
        </div>
      )}

      {handshakes.length > 0 && (
        <div className="mb-6">
          <label htmlFor="dataset" className="block text-sm font-semibold mb-2">
            Choose handshake dataset
          </label>
          <select
            id="dataset"
            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
            value={handshake?.id || ''}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {handshakes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {handshake && (
        <div className="mb-6 space-y-2 text-sm">
          <p className="text-base font-semibold">{handshake.summary}</p>
          <p className="text-red-300">{handshake.labWarning}</p>
          {handshake.environment && (
            <div className="bg-gray-800 rounded p-3 border border-gray-700 space-y-1">
              <p>
                <span className="font-semibold">SSID:</span> {handshake.environment.ssid}
              </p>
              <p>
                <span className="font-semibold">BSSID:</span> {handshake.environment.bssid}
              </p>
              <p>
                <span className="font-semibold">Channel:</span> {handshake.environment.channel}
              </p>
              {Array.isArray(handshake.environment.notes) && (
                <ul className="list-disc list-inside text-xs space-y-1 text-gray-200">
                  {handshake.environment.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {!isSummary && activeMessage && (
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
            {activeMessage.from}
          </span>
          <span className="absolute right-0 -top-6 text-xs">
            {activeMessage.to}
          </span>
        </div>
      )}

      {isSummary ? (
        <div id="summary">
          <h2 className="text-xl mb-2">Lab takeaway summary</h2>
          <div className="mb-4">
            <h3 className="font-semibold">Risks</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {risks.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold">Defenses</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {defenses.map((defense) => (
                <li key={defense}>{defense}</li>
              ))}
            </ul>
          </div>
          {Array.isArray(handshake?.analysis?.labNotices) && (
            <div className="bg-gray-800 border border-red-700 rounded p-3">
              <h3 className="font-semibold mb-2">Lab notices</h3>
              <ul className="list-disc list-inside text-xs space-y-1 text-red-200">
                {handshake.analysis.labNotices.map((notice) => (
                  <li key={notice}>{notice}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-xl mb-2">
            {activeMessage?.step}: {activeMessage?.from} ➜ {activeMessage?.to}
          </h2>
          <p className="text-sm">{activeMessage?.description}</p>
        </div>
      )}

      <div className="mt-4 h-32 overflow-y-auto rounded border border-white/10 bg-kali-dark/90 font-mono text-xs text-kali-terminal shadow-inner">
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
          className="px-4 py-2 rounded border border-white/10 bg-kali-surface-muted text-kali-text transition hover:bg-kali-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        {isSummary ? (
          <button
            onClick={restart}
            className="px-4 py-2 rounded bg-kali-control text-slate-900 font-semibold shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition hover:bg-kali-control/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          >
            Restart
          </button>
        ) : (
          <button
            onClick={next}
            className="px-4 py-2 rounded bg-kali-control text-slate-900 font-semibold shadow-[0_0_0_1px_rgba(255,255,255,0.12)] transition hover:bg-kali-control/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          >
            Next
          </button>
        )}
      </div>

      {handshake?.commandTemplates && handshake.commandTemplates.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl mb-3">Safe command builders</h2>
          <p className="text-xs text-gray-300 mb-3">
            Provide lab values to populate printf-wrapped commands. These
            commands echo text only.
          </p>
          <div className="space-y-6">
            {handshake.commandTemplates.map((template) => {
              const values = commandInputs[template.id] || {};
              const filled = substituteTemplate(template.template, values);
              const escaped = filled.replace(/"/g, '\\"');
              const safeCommand = `printf "Simulated command: %s\\n" "${escaped}"`;

              return (
                <div
                  key={template.id}
                  className="bg-gray-800 border border-gray-700 rounded p-4 space-y-3"
                >
                  <div>
                    <h3 className="text-lg">{template.title}</h3>
                    <p className="text-sm text-gray-300">{template.description}</p>
                  </div>
                  {template.inputs && template.inputs.length > 0 && (
                    <div className="grid gap-3 md:grid-cols-2">
                      {template.inputs.map((input) => (
                        <label key={input.name} className="flex flex-col text-sm">
                          <span className="mb-1 text-xs uppercase tracking-wide text-gray-400">
                            {input.label}
                          </span>
                          <input
                            value={values[input.name] || ''}
                            onChange={(event) =>
                              setCommandInputs((prev) => ({
                                ...prev,
                                [template.id]: {
                                  ...prev[template.id],
                                  [input.name]: event.target.value,
                                },
                              }))
                            }
                            className="bg-gray-900 border border-gray-700 rounded p-2 text-white"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Simulation output</p>
                    <code className="block bg-black text-green-400 text-xs p-2 rounded break-all">
                      {safeCommand}
                    </code>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {Array.isArray(handshake?.analysis?.sections) &&
        handshake.analysis.sections.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl mb-3">Results interpretation</h2>
          <div className="space-y-4">
            {handshake.analysis.sections.map((section) => (
              <div
                key={section.title}
                className="bg-gray-800 border border-gray-700 rounded p-4"
              >
                <h3 className="text-lg mb-2">{section.title}</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {(section.items || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .arrow {
          width: 1rem;
          height: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .arrow-right {
          animation: move-right 1s forwards;
        }
        .arrow-left {
          animation: move-left 1s forwards;
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
