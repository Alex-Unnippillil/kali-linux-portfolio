import React, { useEffect, useState } from 'react';

const MsfPostApp = () => {
  const [modules, setModules] = useState([]);
  const [selected, setSelected] = useState('');
  const [output, setOutput] = useState('');
  const [steps, setSteps] = useState([
    { label: 'Gather System Info', done: false },
    { label: 'Escalate Privileges', done: false },
    { label: 'Establish Persistence', done: false },
    { label: 'Cleanup Traces', done: false },
  ]);
  const [liveMessage, setLiveMessage] = useState('');
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await fetch('/api/metasploit/modules?type=post');
        const data = await res.json();
        setModules(data.modules || []);
      } catch (err) {
        setModules([]);
      }
    };

    fetchModules();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReduceMotion(mq.matches);
    handleChange();
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

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

  const runModule = async () => {
    if (!selected) return;
    setOutput('Running...');
    try {
      const res = await fetch('/api/metasploit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: selected }),
      });
      const data = await res.json();
      setOutput(data.output || 'No output');
      animateSteps();
    } catch (err) {
      setOutput('Error running module');
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col">
      <h2 className="text-lg mb-2">Metasploit Post Modules</h2>
      <div className="flex mb-4">
        <select
          className="flex-1 bg-gray-800 p-2 rounded"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Select a module</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          onClick={runModule}
          className="ml-2 px-4 py-2 bg-blue-600 rounded"
        >
          Run
        </button>
      </div>
      <pre className="flex-1 bg-black p-2 overflow-auto whitespace-pre-wrap">
        {output}
      </pre>
      <div className="sr-only" aria-live="polite" role="status">
        {liveMessage}
      </div>
      <svg
        role="img"
        aria-label="Post-exploitation checklist"
        className="mt-4 mx-auto"
        width="220"
        height={steps.length * 80}
      >
        {steps.map((step, i) => (
          <g key={step.label} transform={`translate(20, ${i * 70 + 20})`}>
            <circle
              cx="0"
              cy="0"
              r="20"
              fill={step.done ? '#22c55e' : '#4b5563'}
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
                stroke="#4b5563"
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
