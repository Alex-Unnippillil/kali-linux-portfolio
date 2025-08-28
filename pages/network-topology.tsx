import React, { useState } from 'react';
import Meta from '../components/SEO/Meta';

const NetworkTopology: React.FC = () => {
  const [mitigated, setMitigated] = useState(false);

  return (
    <>
      <Meta />
      <main className="bg-ub-cool-grey text-white min-h-screen p-4 space-y-4">
        <button
          onClick={() => setMitigated((m) => !m)}
          className="px-4 py-2 bg-blue-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {mitigated ? 'Disable Mitigation' : 'Enable Mitigation'}
        </button>
        <svg
          key={mitigated ? 'mitigated' : 'normal'}
          viewBox="0 0 300 120"
          className="w-full max-w-md"
        >
          <defs>
            <marker
              id="arrow"
              markerWidth="10"
              markerHeight="10"
              refX="10"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#4ade80" />
            </marker>
          </defs>
          {/* Nodes */}
          <rect x="10" y="40" width="80" height="40" fill="#1f2937" stroke="#4ade80" />
          <text x="50" y="65" fill="white" textAnchor="middle">Attacker</text>
          {mitigated ? (
            <>
              <rect x="110" y="40" width="80" height="40" fill="#1f2937" stroke="#f87171" />
              <text x="150" y="65" fill="white" textAnchor="middle">Firewall</text>
              <rect x="210" y="40" width="80" height="40" fill="#1f2937" stroke="#4ade80" />
              <text x="250" y="65" fill="white" textAnchor="middle">Server</text>
              <line
                x1="90"
                y1="60"
                x2="110"
                y2="60"
                stroke="#4ade80"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
              <line
                x1="190"
                y1="60"
                x2="210"
                y2="60"
                stroke="#f87171"
                strokeWidth="2"
                strokeDasharray="4"
              />
              <circle r="5" fill="#4ade80">
                <animateMotion
                  id="mitigation-step1"
                  dur="1s"
                  fill="freeze"
                  path="M90 60 L110 60"
                />
                <animate
                  attributeName="fill"
                  begin="mitigation-step1.end"
                  to="#f87171"
                  dur="0.2s"
                  fill="freeze"
                />
              </circle>
            </>
          ) : (
            <>
              <rect x="110" y="40" width="80" height="40" fill="#1f2937" stroke="#4ade80" />
              <text x="150" y="65" fill="white" textAnchor="middle">Router</text>
              <rect x="210" y="40" width="80" height="40" fill="#1f2937" stroke="#4ade80" />
              <text x="250" y="65" fill="white" textAnchor="middle">Server</text>
              <line
                x1="90"
                y1="60"
                x2="110"
                y2="60"
                stroke="#4ade80"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
              <line
                x1="190"
                y1="60"
                x2="210"
                y2="60"
                stroke="#4ade80"
                strokeWidth="2"
                markerEnd="url(#arrow)"
              />
              <circle r="5" fill="#4ade80">
                <animateMotion
                  id="step1"
                  dur="1s"
                  fill="freeze"
                  path="M90 60 L110 60"
                />
                <animateMotion
                  begin="step1.end"
                  dur="1s"
                  fill="freeze"
                  path="M190 60 L210 60"
                />
              </circle>
            </>
          )}
        </svg>
      </main>
    </>
  );
};

export default NetworkTopology;
