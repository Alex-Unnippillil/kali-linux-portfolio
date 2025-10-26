import React, { useEffect, useMemo, useRef, useState } from 'react';

type Node = 'Victim' | 'Attacker' | 'Gateway';

const positions: Record<Node, { x: number; y: number }> = {
  Victim: { x: 60, y: 120 },
  Attacker: { x: 150, y: 50 },
  Gateway: { x: 240, y: 120 },
};

interface Flow {
  from: Node;
  to: Node;
  color: string;
  blocked?: boolean;
  label?: string;
}

interface Step {
  title: string;
  description: string;
  flows: Flow[];
}

interface ArpLabProps {
  staticArpEnabled: boolean;
  dhcpSnoopingEnabled: boolean;
}

const formatList = (items: string[]) => {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  const head = items.slice(0, -1).join(', ');
  return `${head} and ${items[items.length - 1]}`;
};

const ArpLab = ({
  staticArpEnabled,
  dhcpSnoopingEnabled,
}: ArpLabProps) => {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const defences = useMemo(() => {
    const entries: { label: string; description: string }[] = [];
    if (staticArpEnabled) {
      entries.push({
        label: 'static ARP entries',
        description:
          'Static ARP entries pin trusted MAC addresses so forged replies are ignored.',
      });
    }
    if (dhcpSnoopingEnabled) {
      entries.push({
        label: 'DHCP snooping',
        description:
          'DHCP snooping builds a binding table and drops rogue updates from untrusted ports.',
      });
    }
    return entries;
  }, [staticArpEnabled, dhcpSnoopingEnabled]);

  const defenceLabels = useMemo(
    () => defences.map((d) => d.label),
    [defences]
  );
  const defenceDescriptions = useMemo(
    () => defences.map((d) => d.description),
    [defences]
  );

  const defencesActive = defenceLabels.length > 0;

  const steps = useMemo<Step[]>(
    () => [
      {
        title: 'Normal Operation',
        description: defencesActive
          ? `Victim communicates with the gateway directly while ${formatList(
              defenceLabels
            )} stand ready to enforce layer 2 integrity.`
          : 'Victim communicates with the gateway directly.',
        flows: [{ from: 'Victim', to: 'Gateway', color: '#fbbf24' }],
      },
      {
        title: defencesActive ? 'ARP Poisoning Blocked' : 'ARP Poisoning',
        description: defencesActive
          ? `Attacker attempts to poison the cache, but ${formatList(
              defenceLabels
            )} prevent the forged bindings. ${formatList(
              defenceDescriptions
            )}`
          : 'Attacker sends forged ARP replies to victim and gateway, claiming to be each other.',
        flows: defencesActive
          ? [
              {
                from: 'Attacker',
                to: 'Victim',
                color: '#f87171',
                blocked: true,
                label: 'blocked',
              },
              {
                from: 'Attacker',
                to: 'Gateway',
                color: '#f87171',
                blocked: true,
                label: 'blocked',
              },
              { from: 'Victim', to: 'Gateway', color: '#34d399' },
            ]
          : [
              { from: 'Attacker', to: 'Victim', color: '#f87171' },
              { from: 'Attacker', to: 'Gateway', color: '#f87171' },
            ],
      },
      {
        title: defencesActive ? 'Traffic Stays Direct' : 'Traffic Interception',
        description: defencesActive
          ? 'Traffic continues flowing directly between the victim and gateway; the attacker remains off the path.'
          : "Victim's traffic is now routed through the attacker.",
        flows: defencesActive
          ? [{ from: 'Victim', to: 'Gateway', color: '#34d399' }]
          : [
              { from: 'Victim', to: 'Attacker', color: '#fbbf24' },
              { from: 'Attacker', to: 'Gateway', color: '#fbbf24' },
            ],
      },
    ],
    [defenceDescriptions, defenceLabels, defencesActive]
  );

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
  }, [playing, step, steps.length]);

  const handlePlay = () => setPlaying(true);
  const handleReset = () => {
    setPlaying(false);
    setStep(0);
    setProgress(0);
    startRef.current = null;
  };

  const flows = steps[step].flows;
  const defenceStatus = defencesActive
    ? `Defences active: ${formatList(defenceLabels)} enforcing trusted bindings.`
    : 'Defences inactive: poisoning attempts will alter the path.';

  return (
    <div className="mt-4">
      <h2 className="font-semibold">ARP Cache Poisoning Lab</h2>
      <p className="mt-1 text-xs text-blue-300">{defenceStatus}</p>
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
          <marker
            id="arrow-green"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#34d399" />
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
          const markerId = f.blocked
            ? null
            : f.color === '#f87171'
            ? 'arrow-red'
            : f.color === '#34d399'
            ? 'arrow-green'
            : 'arrow';
          const midX = from.x + (to.x - from.x) / 2;
          const midY = from.y + (to.y - from.y) / 2;
          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={f.blocked ? '#f87171' : f.color}
                strokeWidth={2}
                strokeDasharray={f.blocked ? '6 4' : undefined}
                markerEnd={markerId ? `url(#${markerId})` : undefined}
              />
              {i === 0 && !f.blocked && (
                <circle
                  cx={from.x + (to.x - from.x) * progress}
                  cy={from.y + (to.y - from.y) * progress}
                  r={4}
                  fill={f.color}
                />
              )}
              {f.blocked && (
                <>
                  <line
                    x1={midX - 6}
                    y1={midY - 6}
                    x2={midX + 6}
                    y2={midY + 6}
                    stroke="#f87171"
                    strokeWidth={2}
                  />
                  <line
                    x1={midX - 6}
                    y1={midY + 6}
                    x2={midX + 6}
                    y2={midY - 6}
                    stroke="#f87171"
                    strokeWidth={2}
                  />
                  <text
                    x={midX}
                    y={midY - 10}
                    fill="#f87171"
                    textAnchor="middle"
                    fontSize="8"
                  >
                    {f.label || 'blocked'}
                  </text>
                </>
              )}
              {!f.blocked && f.label && (
                <text
                  x={midX}
                  y={midY - 10}
                  fill={f.color}
                  textAnchor="middle"
                  fontSize="8"
                >
                  {f.label}
                </text>
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

