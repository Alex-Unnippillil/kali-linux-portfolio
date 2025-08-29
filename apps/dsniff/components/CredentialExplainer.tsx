import React, { useEffect, useState } from 'react';

// Simulation: illustrates how weak protocols expose credentials. For educational use only.
const steps = [
  'Victim sends credentials in cleartext over HTTP',
  'Attacker captures those credentials',
  'Attacker replays credentials to the server',
];

const CredentialExplainer: React.FC = () => {
  const [step, setStep] = useState(0);
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      setStep(steps.length);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setStep(Math.min(i, steps.length));
      if (i >= steps.length) clearInterval(id);
    }, 1500);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return (
    <div className="mt-4 p-2 bg-ub-dark text-white rounded">
      <h2 className="text-lg mb-2">Weak Protocol Credential Flow</h2>
      <p className="text-xs mb-2 italic">
        Demonstration of capture and replay. Uses sample data; no real network traffic.
      </p>
      <svg
        viewBox="0 0 260 100"
        className="w-full h-32"
        role="img"
        aria-label="credential capture and replay diagram"
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0,10 3.5,0 7" fill="#fbbf24" />
          </marker>
        </defs>
        <rect x="10" y="35" width="60" height="30" fill="#1f2937" />
        <text x="40" y="53" fontSize="10" fill="#fff" textAnchor="middle">
          Victim
        </text>
        <rect x="100" y="10" width="60" height="30" fill="#374151" />
        <text x="130" y="28" fontSize="10" fill="#fff" textAnchor="middle">
          Attacker
        </text>
        <rect x="190" y="35" width="60" height="30" fill="#1f2937" />
        <text x="220" y="53" fontSize="10" fill="#fff" textAnchor="middle">
          Server
        </text>
        <line
          x1="70"
          y1="50"
          x2="190"
          y2="50"
          stroke="#fbbf24"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          opacity={step >= 1 ? 1 : 0.2}
        />
        <line
          x1="70"
          y1="50"
          x2="100"
          y2="25"
          stroke="#fbbf24"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          opacity={step >= 2 ? 1 : 0.2}
        />
        <line
          x1="160"
          y1="25"
          x2="190"
          y2="50"
          stroke="#f87171"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          opacity={step >= 3 ? 1 : 0.2}
        />
      </svg>
      <ol className="list-decimal pl-5 text-sm mt-2">
        {steps.slice(0, step).map((s, idx) => (
          <li key={idx} className="mb-1">
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default CredentialExplainer;
