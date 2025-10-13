import React, { useEffect, useRef, useState } from 'react';

type Node = 'Victim' | 'Attacker' | 'Gateway';

const positions: Record<Node, { x: number; y: number }> = {
  Victim: { x: 60, y: 120 },
  Attacker: { x: 150, y: 50 },
  Gateway: { x: 240, y: 120 },
};

interface Step {
  title: string;
  description: string;
  flows: { from: Node; to: Node; color: string }[];
}

const steps: Step[] = [
  {
    title: 'Normal Operation',
    description: 'Victim communicates with the gateway directly.',
    flows: [{ from: 'Victim', to: 'Gateway', color: '#fbbf24' }],
  },
  {
    title: 'ARP Poisoning',
    description:
      'Attacker sends forged ARP replies to victim and gateway, claiming to be each other.',
    flows: [
      { from: 'Attacker', to: 'Victim', color: '#f87171' },
      { from: 'Attacker', to: 'Gateway', color: '#f87171' },
    ],
  },
  {
    title: 'Traffic Interception',
    description: "Victim's traffic is now routed through the attacker.",
    flows: [
      { from: 'Victim', to: 'Attacker', color: '#fbbf24' },
      { from: 'Attacker', to: 'Gateway', color: '#fbbf24' },
    ],
  },
];

const ArpLab = () => {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    const animate = (ts: number) => {
      if (startRef.current == null) startRef.current = ts;
      const p = (ts - startRef.current) / 2000;
      if (p >= 1) {
        setProgress(1);
        startRef.current = null;
        setStep((s) => (s + 1) % steps.length);
        setProgress(0);
      } else {
        setProgress(p);
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, step]);

  const handlePlay = () => setPlaying(true);
  const handleReset = () => {
    setPlaying(false);
    setStep(0);
    setProgress(0);
    startRef.current = null;
  };

  const flows = steps[step].flows;

  return (
    <div className="mt-4">
      <h2 className="font-semibold">ARP Cache Poisoning Lab</h2>
      <svg
        width={300}
        height={200}
        className="bg-gray-800 rounded mt-2"
        aria-labelledby="arp-lab-title"
      >
        <title id="arp-lab-title">ARP cache poisoning diagram</title>
        <defs>
          <marker
            id="arrow"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
          </marker>
          <marker
            id="arrow-red"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
          </marker>
        </defs>
        {Object.entries(positions).map(([name, pos]) => (
          <g key={name}>
            <circle cx={pos.x} cy={pos.y} r={20} fill="#1f2937" stroke="white" />
            <text
              x={pos.x}
              y={pos.y + 30}
              fill="white"
              textAnchor="middle"
              fontSize="10"
            >
              {name}
            </text>
          </g>
        ))}
        {flows.map((f, i) => {
          const from = positions[f.from];
          const to = positions[f.to];
          const markerId = f.color === '#f87171' ? 'arrow-red' : 'arrow';
          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={f.color}
                strokeWidth={2}
                markerEnd={`url(#${markerId})`}
              />
              {i === 0 && (
                <circle
                  cx={from.x + (to.x - from.x) * progress}
                  cy={from.y + (to.y - from.y) * progress}
                  r={4}
                  fill={f.color}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 text-sm">
        <div className="font-semibold">{steps[step].title}</div>
        <p>{steps[step].description}</p>
      </div>
      <div className="mt-2 space-x-2">
        <button
          className="px-2 py-1 bg-blue-600 rounded disabled:opacity-50"
          onClick={handlePlay}
          disabled={playing}
        >
          Play
        </button>
        <button
          className="px-2 py-1 bg-gray-600 rounded"
          onClick={handleReset}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default ArpLab;

