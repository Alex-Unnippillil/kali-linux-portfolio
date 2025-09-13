import React from 'react';
import modulesData from './modules.json';

// Render a grid of animated cards for each executed module
export default function HookGraph({ hooks, steps }) {
  const findModule = (id) => modulesData.modules.find((m) => m.id === id);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 h-full overflow-auto p-2">
      {steps.map((step) => {
        const mod = findModule(step.module) || {
          name: step.module,
          description: 'Module metadata not found',
          demo: '',
          link: 'https://github.com/beefproject/beef/wiki',
        };
        return (
          <a
            key={step.id}
            href={mod.link}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-ub-gray-50 text-black p-3 rounded shadow transition-transform duration-300 transform hover:scale-105 fade-in"
          >
            <h3 className="font-bold text-sm mb-1">{mod.name}</h3>
            <p className="text-xs mb-2">{mod.description}</p>
            {mod.demo && (
              <pre className="text-[10px] bg-black text-green-400 p-1 rounded mb-2 overflow-x-auto">
                {mod.demo}
              </pre>
            )}
            <p className="text-[10px] italic">Hook: {step.hook}</p>
          </a>
        );
      })}
      <style jsx>{`
        @media (prefers-reduced-motion: no-preference) {
          .fade-in {
            animation: fadeIn 0.5s ease-in-out;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
        }
      `}</style>
    </div>
  );
}
