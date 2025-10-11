import React, { useCallback, useEffect, useMemo, useState } from 'react';
import data from './data/handshakes.json';
import SmallArrow from '../../util-components/small_arrow';

const ReaverStepper = () => {
  const { handshakes, risks, defenses } = data;
  const messages = handshakes[0]?.messages || [];
  const [current, setCurrent] = useState(0);
  const isSummary = current >= messages.length;
  const totalSteps = messages.length + 1;
  const progressStep = Math.min(current + 1, totalSteps);
  const direction =
    messages[current]?.from === 'Access Point' ? 'right' : 'left';
  const logMessages = messages.slice(0, Math.min(current + 1, messages.length));

  const next = useCallback(
    () => setCurrent((c) => Math.min(messages.length, c + 1)),
    [messages.length],
  );
  const prev = useCallback(() => setCurrent((c) => Math.max(0, c - 1)), []);
  const restart = useCallback(() => setCurrent(0), []);

  const getRoleIcon = useCallback((role) => {
    if (role === 'Access Point') {
      return '📡';
    }
    if (role === 'Client') {
      return '💻';
    }
    return '🔐';
  }, []);

  const educationalCallouts = useMemo(
    () => ({
      M1: [
        {
          title: 'Authenticator kickoff',
          body:
            'The AP broadcasts a fresh ANonce so both sides can derive matching keys for this session.',
        },
        {
          title: 'Security takeaway',
          body:
            'If attackers capture this nonce, they can pair it with later MICs to attempt offline key recovery.',
        },
      ],
      M2: [
        {
          title: 'Supplicant response',
          body:
            'The client replies with its SNonce and a MIC proving it knows the pre-shared secret.',
        },
        {
          title: 'Security takeaway',
          body:
            'Captured MICs let adversaries verify password guesses—strong passphrases are critical here.',
        },
      ],
      M3: [
        {
          title: 'GTK delivery',
          body:
            'The AP ships the group key (GTK) and instructs the client to install the freshly derived PTK.',
        },
        {
          title: 'Security takeaway',
          body:
            'Unpatched clients risk reinstalling old keys (KRACK-style issues), so keep firmware current.',
        },
      ],
      M4: [
        {
          title: 'Handshake confirmation',
          body:
            'The client acknowledges the install, signaling the secure channel is ready for data frames.',
        },
        {
          title: 'Security takeaway',
          body:
            'Repeated confirmations without data can flag deauthentication or capture attempts in progress.',
        },
      ],
    }),
    [],
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const tagName = target?.tagName;
      if (
        target?.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT'
      ) {
        return;
      }

      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'n') {
        event.preventDefault();
        next();
      }

      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'p') {
        event.preventDefault();
        prev();
      }

      if ((event.key === 'r' || event.key === 'R') && isSummary) {
        event.preventDefault();
        restart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSummary, next, prev, restart]);

  const activeCallouts = !isSummary
    ? educationalCallouts[messages[current]?.step] || []
    : [];

  return (
    <div
      id="reaver-stepper"
      className="p-4 bg-ub-cool-grey text-white h-full overflow-y-auto"
    >
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl">EAPOL Handshake Explorer</h1>
        <div className="inline-flex items-center gap-2 rounded bg-black/40 px-3 py-1 text-sm">
          <span className="font-semibold">Step {progressStep}</span>
          <span className="text-xs text-white/70">of {totalSteps}</span>
          {isSummary && <span className="text-xs text-ubt-green">Summary</span>}
        </div>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-3 text-xs text-white/80"
        aria-label="Role legend"
      >
        <span className="inline-flex items-center gap-2 rounded border border-white/10 bg-black/40 px-2 py-1">
          <span aria-hidden>📡</span>
          Access Point
        </span>
        <span className="inline-flex items-center gap-2 rounded border border-white/10 bg-black/40 px-2 py-1">
          <span aria-hidden>💻</span>
          Client
        </span>
      </div>

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
          <span className="absolute left-0 -top-6 text-xs flex items-center gap-1">
            <span aria-hidden>{getRoleIcon(messages[current].from)}</span>
            {messages[current].from}
          </span>
          <span className="absolute right-0 -top-6 text-xs flex items-center gap-1">
            <span aria-hidden>{getRoleIcon(messages[current].to)}</span>
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
          <h2 className="text-xl mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-black/40 px-2 py-1 text-sm">
              <span aria-hidden>{getRoleIcon(messages[current].from)}</span>
              {messages[current].from}
            </span>
            <SmallArrow angle={direction} />
            <span className="inline-flex items-center gap-1 rounded bg-black/40 px-2 py-1 text-sm">
              <span aria-hidden>{getRoleIcon(messages[current].to)}</span>
              {messages[current].to}
            </span>
            <span className="ml-2 text-sm text-white/70">{messages[current].step}</span>
          </h2>
          <p className="text-sm leading-relaxed">
            {messages[current].description}
          </p>

          {activeCallouts.length > 0 && (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {activeCallouts.map((callout) => (
                <div
                  key={callout.title}
                  className="rounded border border-white/10 bg-black/40 p-3 text-sm"
                >
                  <h3 className="font-semibold text-ubt-green">
                    {callout.title}
                  </h3>
                  <p className="mt-1 text-white/90 leading-relaxed">
                    {callout.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 bg-black text-green-400 font-mono text-xs p-2 h-32 overflow-y-auto">
        {logMessages.map((m) => (
          <div key={m.step}>
            [{m.step}] {getRoleIcon(m.from)} {m.from} ➜ {getRoleIcon(m.to)} {m.to}
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

      <div className="mt-3 space-y-1 text-xs text-white/70 print:hidden">
        <p>
          Keyboard: use <span className="rounded bg-black/40 px-1 py-0.5">←</span>{' '}
          / <span className="rounded bg-black/40 px-1 py-0.5">→</span> or press
          <span className="rounded bg-black/40 px-1 py-0.5 ml-1 mr-1">N</span>
          and
          <span className="rounded bg-black/40 px-1 py-0.5 ml-1 mr-1">P</span>
          to move between steps. On the summary screen, press
          <span className="rounded bg-black/40 px-1 py-0.5 ml-1">R</span> to
          restart.
        </p>
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
