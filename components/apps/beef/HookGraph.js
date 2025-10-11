import React, { useMemo } from 'react';
import modulesData from './modules.json';

// Render a grid of animated cards for each executed module
export default function HookGraph({ hooks = [], steps = [] }) {
  const moduleList = modulesData.modules;
  const hookMap = useMemo(
    () => new Map(hooks.map((hook) => [hook.id, hook])),
    [hooks]
  );

  const findModule = (id) => moduleList.find((m) => m.id === id);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 h-full overflow-auto p-2">
      {steps.map((step) => {
        const mod =
          findModule(step.module) || {
            name: step.module,
            description: 'Module metadata not found',
            demo: '',
            link: 'https://github.com/beefproject/beef/wiki',
            category: 'Unknown',
            labOnly: false,
            explanation: '',
          };
        const hook =
          hookMap.get(step.hook) || {
            codename: step.hook,
            status: 'Unknown',
            scope: 'Untracked scope',
            note: '',
          };

        return (
          <a
            key={step.id}
            href={mod.link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-ub-gray-50 text-black p-3 rounded shadow transition-transform duration-300 transform hover:scale-105 focus:outline-none focus:ring fade-in"
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm">{mod.name}</h3>
              <span className="text-[10px] uppercase tracking-wide text-gray-600">
                {mod.category}
              </span>
            </div>
            {mod.labOnly && (
              <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-red-200 text-red-800 px-2 py-0.5 rounded mb-2">
                Lab mode
              </span>
            )}
            <p className="text-xs mb-2">
              {step.outcome || mod.explanation || mod.description}
            </p>
            {mod.demo && (
              <pre className="text-[10px] bg-black text-green-400 p-1 rounded mb-2 overflow-x-auto">
                {mod.demo}
              </pre>
            )}
            <p className="text-[10px] italic mb-1">
              Hook: {hook.codename} · {hook.status}
            </p>
            <p className="text-[10px] text-gray-600">
              {hook.scope}
              {hook.note ? ` — ${hook.note}` : ''}
            </p>
            {step.timestamp && (
              <p className="text-[10px] text-gray-600 mt-1">Timestamp: {step.timestamp}</p>
            )}
          </a>
        );
      })}
      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
