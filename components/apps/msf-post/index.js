import React, { useEffect, useState } from 'react';

// Sample module catalog for demo purposes only
const MODULE_CATALOG = [
  {
    name: 'post/multi/recon/local_exploit_suggester',
    platform: 'multi',
    session: 'meterpreter',
  },
  {
    name: 'post/windows/manage/enable_rdp',
    platform: 'windows',
    session: 'meterpreter',
  },
  {
    name: 'post/linux/gather/enum_network',
    platform: 'linux',
    session: 'shell',
  },
];

const PLATFORMS = ['multi', 'windows', 'linux'];
const SESSION_TYPES = ['meterpreter', 'shell'];

const escapeText = (text) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const MsfPostApp = () => {
  const [modules, setModules] = useState([]);
  const [output, setOutput] = useState('');
  const [platform, setPlatform] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [steps, setSteps] = useState([
    { label: 'Gather System Info', done: false },
    { label: 'Escalate Privileges', done: false },
    { label: 'Establish Persistence', done: false },
    { label: 'Cleanup Traces', done: false },
  ]);
  const [liveMessage, setLiveMessage] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setModules(MODULE_CATALOG);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReduceMotion(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const filteredModules = modules.filter(
    (m) =>
      (!platform || m.platform === platform) &&
      (!sessionType || m.session === sessionType)
  );

  const animateSteps = () => {
    setSteps((prev) => prev.map((s) => ({ ...s, done: false })));
    let index = 0;
    const total = steps.length;
    const update = () => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, done: true } : s))
      );
      setLiveMessage(`${steps[index].label} completed`);
      index += 1;
      if (index < total) {
        if (reduceMotion) {
          setTimeout(update, 0);
        } else {
          requestAnimationFrame(update);
        }
      }
    };
    update();
  };

  const runModule = (mod) => {
    if (!mod) return;
    setOutput(`# Running ${mod}\nSample output line 1\nSample output line 2`);
    animateSteps();
  };

  const copyAsCode = async () => {
    if (!output) return;
    const escaped = escapeText(output);
    const codeBlock = '```\n' + escaped + '\n```';
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(codeBlock);
      } catch (err) {
        /* ignore clipboard errors */
      }
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col">
      <h2 className="text-lg mb-2">Metasploit Post Modules</h2>
      <div className="flex mb-4 space-x-2">
        <select
          className="bg-gray-800 p-2 rounded"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="bg-gray-800 p-2 rounded"
          value={sessionType}
          onChange={(e) => setSessionType(e.target.value)}
        >
          <option value="">All Sessions</option>
          {SESSION_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={copyAsCode}
          className="px-4 py-2 bg-green-600 rounded"
        >
          Copy as code
        </button>
      </div>
      <ul className="mb-4 flex-1 overflow-auto">
        {filteredModules.map((m) => (
          <li key={m.name} className="mb-2 flex items-center">
            <button
              onClick={() => runModule(m.name)}
              className="mr-2 px-2 py-1 bg-blue-600 rounded"
            >
              Run
            </button>
            <a
              href={`https://www.rapid7.com/db/modules/${m.name}`}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 hover:underline"
            >
              {m.name}
            </a>
            <span className="ml-2 text-xs text-gray-400">
              [{m.platform} / {m.session}]
            </span>
          </li>
        ))}
      </ul>
      <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap">
        {output}
      </pre>
      <div className="sr-only" aria-live="polite" role="status">
        {liveMessage}
      </div>
      <svg
        role="list"
        aria-label="Post-exploitation checklist"
        className="mt-4 mx-auto"
        width="220"
        height={steps.length * 80}
      >
        {steps.map((step, i) => (
          <g
            key={step.label}
            role="listitem"
            aria-label={`${step.label} ${step.done ? 'completed' : 'pending'}`}
            transform={`translate(20, ${i * 70 + 20})`}
          >
            <circle
              cx="0"
              cy="0"
              r="20"
              fill={step.done ? '#22c55e' : '#6b7280'}
            />
            {step.done && (
              <path
                d="M-8 0 l4 4 l8 -8"
                stroke="#fff"
                strokeWidth="2"
                fill="none"
              />
            )}
            <text
              x="40"
              y="5"
              fill={step.done ? '#22c55e' : '#d1d5db'}
              fontSize="14"
            >
              {step.label}
            </text>
            {i < steps.length - 1 && (
              <line
                x1="0"
                y1="20"
                x2="0"
                y2="70"
                stroke="#6b7280"
                strokeWidth="2"
              />
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

export default MsfPostApp;
