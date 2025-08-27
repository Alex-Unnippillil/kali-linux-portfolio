import React, { useEffect, useRef, useState } from 'react';
import data from './data.json';

const { arpTable, flows } = data;
const attackerMac = 'aa:aa:aa:aa:aa:aa';

const randomMac = () =>
  Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join(':');

const EttercapApp = () => {
  const [target1, setTarget1] = useState('');
  const [target2, setTarget2] = useState('');
  const [mac1, setMac1] = useState('');
  const [mac2, setMac2] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState([]);

  const containerRef = useRef(null);
  const attackerRef = useRef(null);
  const target1Ref = useRef(null);
  const target2Ref = useRef(null);
  const arrow1Ref = useRef(null);
  const arrow2Ref = useRef(null);
  const animationRef = useRef(null);
  const logIntervalRef = useRef(null);
  const prefersReduced = useRef(false);
  const [lines, setLines] = useState({
    l1: { x1: 0, y1: 0, x2: 0, y2: 0 },
    l2: { x1: 0, y1: 0, x2: 0, y2: 0 },
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReduced.current = media.matches;
    const handler = () => (prefersReduced.current = media.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => () => clearInterval(logIntervalRef.current), []);

  const computeLines = () => {
    const container = containerRef.current?.getBoundingClientRect();
    const attacker = attackerRef.current?.getBoundingClientRect();
    const t1 = target1Ref.current?.getBoundingClientRect();
    const t2 = target2Ref.current?.getBoundingClientRect();
    if (!container || !attacker || !t1 || !t2) return;
    setLines({
      l1: {
        x1: attacker.left + attacker.width / 2 - container.left,
        y1: attacker.top + attacker.height / 2 - container.top,
        x2: t1.left + t1.width / 2 - container.left,
        y2: t1.top + t1.height / 2 - container.top,
      },
      l2: {
        x1: attacker.left + attacker.width / 2 - container.left,
        y1: attacker.top + attacker.height / 2 - container.top,
        x2: t2.left + t2.width / 2 - container.left,
        y2: t2.top + t2.height / 2 - container.top,
      },
    });
  };

  const moveArrow = (fromRef, toRef, arrowRef, progress) => {
    const from = fromRef.current?.getBoundingClientRect();
    const to = toRef.current?.getBoundingClientRect();
    const container = containerRef.current?.getBoundingClientRect();
    if (!from || !to || !container || !arrowRef.current) return;
    const x1 = from.left + from.width / 2 - container.left;
    const y1 = from.top + from.height / 2 - container.top;
    const x2 = to.left + to.width / 2 - container.left;
    const y2 = to.top + to.height / 2 - container.top;
    const x = x1 + (x2 - x1) * progress;
    const y = y1 + (y2 - y1) * progress;
    arrowRef.current.setAttribute('cx', x);
    arrowRef.current.setAttribute('cy', y);
  };

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(animationRef.current);
      return;
    }
    computeLines();
    const start = performance.now();
    if (prefersReduced.current) {
      moveArrow(attackerRef, target1Ref, arrow1Ref, 1);
      moveArrow(attackerRef, target2Ref, arrow2Ref, 1);
      return;
    }
    const step = (now) => {
      const progress = ((now - start) % 2000) / 2000;
      moveArrow(attackerRef, target1Ref, arrow1Ref, progress);
      moveArrow(attackerRef, target2Ref, arrow2Ref, progress);
      animationRef.current = requestAnimationFrame(step);
    };
    animationRef.current = requestAnimationFrame(step);
    window.addEventListener('resize', computeLines);
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', computeLines);
    };
  }, [running, target1, target2]);

  const startSpoof = () => {
    if (!target1 || !target2) return;
    setMac1(randomMac());
    setMac2(randomMac());
    setStatus(`Sending spoofed ARP replies to ${target1} and ${target2}`);
    setLogs([]);
    setRunning(true);
    logIntervalRef.current = setInterval(() => {
      setLogs((prev) => {
        const entries = [
          `ARP reply ${target1} is-at ${attackerMac}`,
          `ARP reply ${target2} is-at ${attackerMac}`,
        ];
        return [...prev, ...entries].slice(-50);
      });
    }, 1000);
  };

  const stopSpoof = () => {
    cancelAnimationFrame(animationRef.current);
    clearInterval(logIntervalRef.current);
    setRunning(false);
    setStatus('ARP spoofing stopped');
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full bg-gray-900 text-white p-4 flex flex-col"
    >
      <div className="flex mb-4 space-x-2">
        <input
          className="flex-1 p-2 rounded text-black"
          placeholder="Victim IP"
          value={target1}
          onChange={(e) => setTarget1(e.target.value)}
          disabled={running}
        />
        <input
          className="flex-1 p-2 rounded text-black"
          placeholder="Gateway IP"
          value={target2}
          onChange={(e) => setTarget2(e.target.value)}
          disabled={running}
        />
        {!running ? (
          <button
            className="px-4 py-2 bg-green-600 rounded"
            onClick={startSpoof}
            aria-label="start arp spoofing"
          >
            Spoof
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-red-600 rounded"
            onClick={stopSpoof}
            aria-label="stop arp spoofing"
          >
            Stop
          </button>
        )}
      </div>
      <div className="flex-1 relative flex items-center justify-around">
        <div
          ref={attackerRef}
          className="p-2 bg-gray-800 border border-white rounded text-center"
        >
          <div>Attacker</div>
          <div className="font-mono text-xs">{attackerMac}</div>
        </div>
        <div
          ref={target1Ref}
          className="p-2 bg-gray-800 border border-white rounded text-center"
        >
          <div>{target1 || 'Victim'}</div>
          <div className="font-mono text-xs">{mac1 || '--:--:--:--:--:--'}</div>
        </div>
        <div
          ref={target2Ref}
          className="p-2 bg-gray-800 border border-white rounded text-center"
        >
          <div>{target2 || 'Gateway'}</div>
          <div className="font-mono text-xs">{mac2 || '--:--:--:--:--:--'}</div>
        </div>
        {running && (
          <svg className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="10"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
              </marker>
            </defs>
            <line
              x1={lines.l1.x1}
              y1={lines.l1.y1}
              x2={lines.l1.x2}
              y2={lines.l1.y2}
              stroke="#fbbf24"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <text
              x={(lines.l1.x1 + lines.l1.x2) / 2}
              y={(lines.l1.y1 + lines.l1.y2) / 2 - 5}
              fill="#fbbf24"
              textAnchor="middle"
              className="text-xs"
            >
              spoofed ARP
            </text>
            <line
              x1={lines.l2.x1}
              y1={lines.l2.y1}
              x2={lines.l2.x2}
              y2={lines.l2.y2}
              stroke="#fbbf24"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <text
              x={(lines.l2.x1 + lines.l2.x2) / 2}
              y={(lines.l2.y1 + lines.l2.y2) / 2 - 5}
              fill="#fbbf24"
              textAnchor="middle"
              className="text-xs"
            >
              spoofed ARP
            </text>
            <circle ref={arrow1Ref} r="4" fill="#fbbf24" />
            <circle ref={arrow2Ref} r="4" fill="#fbbf24" />
          </svg>
        )}
      </div>
      <div
        className="mt-4 bg-black text-green-400 p-2 font-mono h-32 overflow-auto"
        aria-label="terminal log"
      >
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      <div className="mt-4">
        <h2 className="font-semibold">ARP Table</h2>
        <table className="w-full text-left border-collapse mt-2">
          <caption className="sr-only">Mock ARP entries</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b px-2 py-1">
                IP Address
              </th>
              <th scope="col" className="border-b px-2 py-1">
                MAC Address
              </th>
            </tr>
          </thead>
          <tbody>
            {arpTable.map(({ ip, mac }) => (
              <tr key={ip}>
                <td className="px-2 py-1 font-mono">{ip}</td>
                <td className="px-2 py-1 font-mono">{mac}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <h2 className="font-semibold">Observed Flows</h2>
        <table className="w-full text-left border-collapse mt-2">
          <caption className="sr-only">Mock network flows</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b px-2 py-1">
                Source
              </th>
              <th scope="col" className="border-b px-2 py-1">
                Destination
              </th>
              <th scope="col" className="border-b px-2 py-1">
                Protocol
              </th>
            </tr>
          </thead>
          <tbody>
            {flows.map((f, i) => (
              <tr key={`${f.source}-${f.destination}-${i}`}>
                <td className="px-2 py-1 font-mono">{f.source}</td>
                <td className="px-2 py-1 font-mono">{f.destination}</td>
                <td className="px-2 py-1">{f.protocol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-xs bg-gray-800 p-2 rounded">
        <p>
          ARP poisoning works by sending forged Address Resolution Protocol
          replies to the victim and gateway so they associate the attacker&rsquo;s MAC
          address with each other&rsquo;s IP. This lets the attacker intercept the
          traffic between them.
        </p>
        <p className="mt-2 text-yellow-400">
          Disclaimer: for educational use only. Do not perform ARP spoofing on
          networks without explicit permission.
        </p>
      </div>
      <div aria-live="polite" className="sr-only">
        {status}
      </div>
    </div>
  );
};

export default EttercapApp;

export const displayEttercap = () => <EttercapApp />;

