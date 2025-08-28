import React from 'react';

const FLOW_STEPS = [
  { label: 'Hook', text: 'Await a browser to hook into the demo.' },
  { label: 'Select', text: 'Pick a hooked browser to target.' },
  { label: 'Module', text: 'Choose a module and execute it.' },
  { label: 'Output', text: 'Review the module output.' },
];

export default function HookStepper({ hooks = [], selected, steps = [], output }) {
  let current = 0;
  if (hooks.length) current = 1;
  if (selected) current = 2;
  if (steps.length) current = 3;
  if (output) current = 4;
  const index = Math.min(current, FLOW_STEPS.length - 1);

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="flex items-center space-x-2 mb-2">
        {FLOW_STEPS.map((s, i) => (
          <React.Fragment key={s.label}>
            <div
              className={`px-2 py-1 rounded text-xs ${
                i <= index ? 'bg-ub-primary' : 'bg-gray-700'
              }`}
            >
              {s.label}
            </div>
            {i < FLOW_STEPS.length - 1 && <span>→</span>}
          </React.Fragment>
        ))}
      </div>
      <p className="text-center text-xs max-w-md">{FLOW_STEPS[index].text}</p>
    </div>
  );
}
