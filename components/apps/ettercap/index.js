import React, { useEffect, useRef, useState } from 'react';

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

  const containerRef = useRef(null);
  const attackerRef = useRef(null);
  const target1Ref = useRef(null);
  const target2Ref = useRef(null);
  const arrow1Ref = useRef(null);
  const arrow2Ref = useRef(null);
  const animationRef = useRef(null);
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
    setRunning(true);
  };

  const stopSpoof = () => {
    cancelAnimationFrame(animationRef.current);
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
          <div className="font-mono text-xs">aa:aa:aa:aa:aa:aa</div>
        </div>
        <div
          ref={target1Ref}
          className="p-2 bg-gray-800 border border-white rounded text-center"
        >
          <div>{target1 || 'Target 1'}</div>
          <div className="font-mono text-xs">{mac1 || '--:--:--:--:--:--'}</div>
        </div>
        <div
          ref={target2Ref}
          className="p-2 bg-gray-800 border border-white rounded text-center"
        >
          <div>{target2 || 'Target 2'}</div>
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
            <line
              x1={lines.l2.x1}
              y1={lines.l2.y1}
              x2={lines.l2.x2}
              y2={lines.l2.y2}
              stroke="#fbbf24"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            <circle ref={arrow1Ref} r="4" fill="#fbbf24" />
            <circle ref={arrow2Ref} r="4" fill="#fbbf24" />
          </svg>
        )}
      </div>
      <div aria-live="polite" className="sr-only">
        {status}
      </div>
    </div>
  );
};

export default EttercapApp;

export const displayEttercap = () => <EttercapApp />;

