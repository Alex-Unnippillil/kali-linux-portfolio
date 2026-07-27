import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import data from './data.json';
import ArpLab from './components/ArpLab';
import vendors from '../kismet/oui.json';

const { arpTable, flows } = data;
const attackerMac = 'aa:aa:aa:aa:aa:aa';

const filterExamples = {
  'Block HTTP': "if (ip.proto == 'TCP' && tcp.port == 80) {\n  drop();\n}",
  'Pass DNS': "if (udp.port == 53) {\n  pass();\n}",
};

const randomMac = () =>
  Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join(':');

const formatList = (items) => {
  if (!items.length) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
};

const EttercapApp = () => {
  const [target1, setTarget1] = useState('');
  const [target2, setTarget2] = useState('');
  const [mac1, setMac1] = useState('');
  const [mac2, setMac2] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState([]);
  const [flowIndex, setFlowIndex] = useState(0);
  const [filterText, setFilterText] = useState(filterExamples['Block HTTP']);
  const [staticArpEnabled, setStaticArpEnabled] = useState(false);
  const [dhcpSnoopingEnabled, setDhcpSnoopingEnabled] = useState(false);
  const [spoofBlockedBy, setSpoofBlockedBy] = useState([]);

  const defenceLabels = useMemo(() => {
    const labels = [];
    if (staticArpEnabled) labels.push('static ARP entries');
    if (dhcpSnoopingEnabled) labels.push('DHCP snooping');
    return labels;
  }, [staticArpEnabled, dhcpSnoopingEnabled]);

  const defenceDescriptions = useMemo(() => {
    const descriptions = [];
    if (staticArpEnabled) {
      descriptions.push(
        'Static ARP entries pin trusted MAC addresses so forged replies are ignored.'
      );
    }
    if (dhcpSnoopingEnabled) {
      descriptions.push(
        'DHCP snooping builds a binding table and drops rogue updates from untrusted ports.'
      );
    }
    return descriptions;
  }, [staticArpEnabled, dhcpSnoopingEnabled]);

  const defencesActive = defenceLabels.length > 0;
  const defenceNarrative = defenceDescriptions.join(' ');
  const defenceStatusText = defencesActive
    ? `Current defences: ${formatList(defenceLabels)}.${
        defenceNarrative ? ` ${defenceNarrative}` : ''
      }`
    : 'Current defences: none — forged ARP replies will reroute traffic until protections are enabled.';
  const storyboardStatus = defencesActive
    ? `Topology highlights blocked paths when ${formatList(defenceLabels)} are active.`
    : 'Topology illustrates the attacker sitting in the path when defences are disabled.';
  const blockedMessage = spoofBlockedBy.length ? formatList(spoofBlockedBy) : '';
  const mitigationExplainer = defenceDescriptions.length
    ? defenceNarrative
    : 'Enable static ARP entries or DHCP snooping above to pin trusted MAC addresses and drop rogue updates.';

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
  const canvasRef = useRef(null);
  const hostPositions = useRef({});
  const arpEntries = useMemo(
    () =>
      arpTable.map(({ ip, mac }) => ({
        ip,
        mac,
        vendor: vendors[mac.slice(0, 8).toUpperCase()] || 'Unknown',
      })),
    []
  );

  // storyboard state for interactive canvas
  const boardRef = useRef(null);
  const nodesRef = useRef({
    attacker: { x: 150, y: 60, label: 'Attacker' },
    victim: { x: 50, y: 140, label: 'Victim' },
    gateway: { x: 250, y: 140, label: 'Gateway' },
  });
  const [nodes, setNodes] = useState(nodesRef.current);
  const [dragNode, setDragNode] = useState(null);
  const [step, setStep] = useState(0);
  const [traceIndex, setTraceIndex] = useState(0);
  const [animProgress, setAnimProgress] = useState(0);

  const steps = useMemo(
    () => [
      {
        title: 'Normal Operation',
        packetTrace: [
          'Victim -> Gateway: DNS query',
          'Gateway -> Victim: DNS response',
        ],
        before: [
          {
            from: 'Victim',
            to: 'Gateway',
            color: defencesActive ? '#34d399' : '#fbbf24',
            label: defencesActive ? 'legitimate' : undefined,
          },
        ],
        after: [
          {
            from: 'Victim',
            to: 'Gateway',
            color: defencesActive ? '#34d399' : '#fbbf24',
            label: defencesActive ? 'legitimate' : undefined,
          },
        ],
      },
      {
        title: defencesActive ? 'ARP Poisoning Blocked' : 'ARP Poisoning',
        packetTrace: defencesActive
          ? [
              'Attacker -> Victim: forged ARP reply (spoofed gateway MAC)',
              'Attacker -> Gateway: forged ARP reply (victim is-at attacker)',
              ...defenceDescriptions.map((desc) => `Mitigation: ${desc}`),
              `Switch/host: ${formatList(defenceLabels)} reject the rogue update.`,
            ]
          : [
              'Attacker -> Victim: ARP reply (gateway is-at attacker)',
              'Attacker -> Gateway: ARP reply (victim is-at attacker)',
            ],
        before: [
          {
            from: 'Victim',
            to: 'Gateway',
            color: defencesActive ? '#34d399' : '#fbbf24',
            label: defencesActive ? 'legitimate' : undefined,
          },
        ],
        after: defencesActive
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
              {
                from: 'Victim',
                to: 'Gateway',
                color: '#34d399',
                label: 'legitimate',
              },
            ]
          : [
              { from: 'Victim', to: 'Attacker', color: '#fbbf24' },
              { from: 'Attacker', to: 'Gateway', color: '#fbbf24' },
            ],
      },
      {
        title: defencesActive ? 'Traffic Protected' : 'DNS Spoofing',
        packetTrace: defencesActive
          ? [
              'Victim -> Gateway: DNS query (unchanged path)',
              'Gateway -> Victim: DNS response delivered without interception',
              `Attacker: kept off-path by ${formatList(defenceLabels)}.`,
            ]
          : [
              'Victim -> Attacker: DNS query',
              'Attacker -> Victim: spoofed DNS response',
            ],
        before: defencesActive
          ? [
              {
                from: 'Victim',
                to: 'Gateway',
                color: '#34d399',
                label: 'legitimate',
              },
            ]
          : [
              { from: 'Victim', to: 'Attacker', color: '#fbbf24' },
              { from: 'Attacker', to: 'Gateway', color: '#fbbf24' },
            ],
        after: defencesActive
          ? [
              {
                from: 'Victim',
                to: 'Gateway',
                color: '#34d399',
                label: 'legitimate',
              },
            ]
          : [
              { from: 'Victim', to: 'Attacker', color: '#fbbf24' },
              { from: 'Attacker', to: 'Gateway', color: '#f87171' },
            ],
      },
    ],
    [defenceDescriptions, defenceLabels, defencesActive]
  );

  const drawStoryboard = useCallback(() => {
    const canvas = boardRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const activeNodes = nodesRef.current;
    const flowsToDraw = steps[step].after;
    flowsToDraw.forEach((f, i) => {
      const from = activeNodes[f.from.toLowerCase()];
      const to = activeNodes[f.to.toLowerCase()];
      if (!from || !to) return;
      ctx.strokeStyle = f.blocked ? '#f87171' : f.color;
      ctx.lineWidth = 2;
      if (f.blocked) {
        ctx.setLineDash([6, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const midX = from.x + (to.x - from.x) / 2;
      const midY = from.y + (to.y - from.y) / 2;
      if (f.blocked) {
        ctx.strokeStyle = '#f87171';
        ctx.beginPath();
        ctx.moveTo(midX - 6, midY - 6);
        ctx.lineTo(midX + 6, midY + 6);
        ctx.moveTo(midX - 6, midY + 6);
        ctx.lineTo(midX + 6, midY - 6);
        ctx.stroke();
        ctx.fillStyle = '#f87171';
        ctx.textAlign = 'center';
        ctx.font = '10px monospace';
        ctx.fillText(f.label || 'blocked', midX, midY - 10);
      } else if (f.label) {
        ctx.fillStyle = f.color;
        ctx.textAlign = 'center';
        ctx.font = '10px monospace';
        ctx.fillText(f.label, midX, midY - 10);
      }
      if (i === 0 && !f.blocked) {
        const x = from.x + (to.x - from.x) * animProgress;
        const y = from.y + (to.y - from.y) * animProgress;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    Object.values(activeNodes).forEach((n) => {
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(n.x, n.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '10px monospace';
      ctx.fillText(n.label, n.x, n.y + 30);
    });
  }, [animProgress, step, steps]);

  useEffect(() => {
    nodesRef.current = nodes;
    drawStoryboard();
  }, [nodes, drawStoryboard]);

  useEffect(() => {
    const canvas = boardRef.current;
    if (!canvas) return;
    const getNodeAt = (x, y) => {
      return Object.entries(nodesRef.current).find(
        ([, n]) => Math.hypot(n.x - x, n.y - y) < 20
      )?.[0];
    };
    const handleDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const nodeKey = getNodeAt(x, y);
      if (nodeKey) setDragNode(nodeKey);
    };
    const handleMove = (e) => {
      if (!dragNode) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setNodes((n) => ({ ...n, [dragNode]: { ...n[dragNode], x, y } }));
    };
    const handleUp = () => setDragNode(null);
    canvas.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      canvas.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragNode]);

  useEffect(() => {
    let start;
    let raf;
    const stepAnim = (ts) => {
      if (!start) start = ts;
      const progress = ((ts - start) % 2000) / 2000;
      setAnimProgress(progress);
      raf = requestAnimationFrame(stepAnim);
    };
    raf = requestAnimationFrame(stepAnim);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  useEffect(() => {
    setTraceIndex(0);
    const traces = steps[step].packetTrace;
    let idx = 0;
    const id = setInterval(() => {
      idx++;
      if (idx > traces.length) {
        clearInterval(id);
      } else {
        setTraceIndex(idx);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [step, steps]);

  useEffect(() => {
    setNodes((n) => ({
      ...n,
      victim: { ...n.victim, label: target1 || 'Victim' },
      gateway: { ...n.gateway, label: target2 || 'Gateway' },
    }));
  }, [target1, target2]);

  const nextStep = () => setStep((s) => (s + 1) % steps.length);
  const restartLab = () => {
    setNodes({
      attacker: { x: 150, y: 60, label: 'Attacker' },
      victim: { x: 50, y: 140, label: target1 || 'Victim' },
      gateway: { x: 250, y: 140, label: target2 || 'Gateway' },
    });
    setStep(0);
    setTraceIndex(0);
    stopSpoof('');
    setStaticArpEnabled(false);
    setDhcpSnoopingEnabled(false);
    setSpoofBlockedBy([]);
    setLogs([]);
    setMac1('');
    setMac2('');
    setStatus('');
  };

  const renderMini = (flowsArr) => {
    const positions = {
      Victim: { x: 40, y: 40 },
      Attacker: { x: 110, y: 40 },
      Gateway: { x: 180, y: 40 },
    };
    return (
      <svg width="220" height="80" aria-hidden="true">
        <defs>
          <marker
            id="mini-arrow"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
          </marker>
          <marker
            id="mini-arrow-red"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#f87171" />
          </marker>
          <marker
            id="mini-arrow-green"
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
          <React.Fragment key={name}>
            <rect
              x={pos.x - 30}
              y={pos.y - 10}
              width={60}
              height={20}
              fill="#1f2937"
              stroke="white"
            />
            <text
              x={pos.x}
              y={pos.y + 4}
              fill="white"
              textAnchor="middle"
              fontSize="10"
            >
              {name}
            </text>
          </React.Fragment>
        ))}
        {flowsArr.map((f, i) => {
          const from = positions[f.from];
          const to = positions[f.to];
          const start = { x: from.x + 30, y: from.y };
          const end = { x: to.x - 30, y: to.y };
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const markerId = f.blocked
            ? null
            : f.color === '#f87171'
            ? 'mini-arrow-red'
            : f.color === '#34d399'
            ? 'mini-arrow-green'
            : 'mini-arrow';
          return (
            <React.Fragment key={i}>
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={f.blocked ? '#f87171' : f.color}
                strokeWidth="2"
                strokeDasharray={f.blocked ? '6 4' : undefined}
                markerEnd={markerId ? `url(#${markerId})` : undefined}
              />
              {f.blocked && (
                <>
                  <line
                    x1={midX - 6}
                    y1={midY - 6}
                    x2={midX + 6}
                    y2={midY + 6}
                    stroke="#f87171"
                    strokeWidth="2"
                  />
                  <line
                    x1={midX - 6}
                    y1={midY + 6}
                    x2={midX + 6}
                    y2={midY - 6}
                    stroke="#f87171"
                    strokeWidth="2"
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
            </React.Fragment>
          );
        })}
      </svg>
    );
  };

  const highlightFilter = (code) =>
    code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(if|else|drop|pass)/g, '<span class="text-blue-400">$1</span>')
      .replace(/('[^']*')/g, '<span class="text-green-300">$1</span>');

  const drawMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Object.entries(hostPositions.current).forEach(([ip, pos]) => {
      ctx.fillStyle = '#1f2937';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ip, pos.x, pos.y + 25);
    });
    flows.forEach((f, i) => {
      const from = hostPositions.current[f.source];
      const to = hostPositions.current[f.destination];
      if (!from || !to) return;
      ctx.strokeStyle = i === flowIndex ? '#fbbf24' : '#4b5563';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    });
  }, [flowIndex]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReduced.current = media.matches;
    const handler = () => (prefersReduced.current = media.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => () => clearInterval(logIntervalRef.current), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(cx, cy) - 30;
    const positions = {};
    arpTable.forEach(({ ip }, idx) => {
      const angle = (idx / arpTable.length) * Math.PI * 2;
      positions[ip] = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });
    hostPositions.current = positions;
    drawMap();
  }, [drawMap]);

  useEffect(() => {
    drawMap();
  }, [drawMap]);

  useEffect(() => {
    if (!flows.length) return;
    const id = setInterval(
      () => setFlowIndex((i) => (i + 1) % flows.length),
      1500
    );
    return () => clearInterval(id);
  }, []);

  const computeLines = useCallback(() => {
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
  }, []);

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

  const handleSpoofBlocked = useCallback(
    (labels, context = {}) => {
      if (!labels.length) return;
      cancelAnimationFrame(animationRef.current);
      clearInterval(logIntervalRef.current);
      setRunning(false);
      computeLines();
      setSpoofBlockedBy(labels);
      setMac1('');
      setMac2('');
      const formatted = formatList(labels);
      const attemptSummary = context.victim && context.gateway
        ? `Blocked forged ARP replies targeting ${context.victim} and ${context.gateway}.`
        : 'Blocked forged ARP replies before they altered the path.';
      setStatus(`Spoof attempt blocked by ${formatted}.`);
      setLogs((prev) => {
        const mitigationLines = defenceDescriptions.map((desc) => `Mitigation: ${desc}`);
        const entries = [attemptSummary, ...mitigationLines];
        return [...prev, ...entries].slice(-50);
      });
    },
    [computeLines, defenceDescriptions]
  );

  const startSpoof = () => {
    if (!target1 || !target2) return;
    if (defencesActive) {
      handleSpoofBlocked(defenceLabels, { victim: target1, gateway: target2 });
      return;
    }
    setSpoofBlockedBy([]);
    setMac1(randomMac());
    setMac2(randomMac());
    setStatus(`Simulating spoofed ARP replies to ${target1} and ${target2}`);
    setLogs([]);
    setRunning(true);
    logIntervalRef.current = setInterval(() => {
      setLogs((prev) => {
        const entries = [
          `Simulated ARP reply ${target1} is-at ${attackerMac}`,
          `Simulated ARP reply ${target2} is-at ${attackerMac}`,
        ];
        return [...prev, ...entries].slice(-50);
      });
    }, 1000);
  };

  const stopSpoof = (message = 'ARP spoofing simulation stopped') => {
    cancelAnimationFrame(animationRef.current);
    clearInterval(logIntervalRef.current);
    setRunning(false);
    setStatus(message);
    setSpoofBlockedBy([]);
    setMac1('');
    setMac2('');
  };

  useEffect(() => {
    if (!running || !defencesActive) return;
    handleSpoofBlocked(defenceLabels, {
      victim: target1 || 'Victim',
      gateway: target2 || 'Gateway',
    });
  }, [defenceLabels, defencesActive, handleSpoofBlocked, running, target1, target2]);

  useEffect(() => {
    if (!defencesActive) {
      setSpoofBlockedBy([]);
    }
  }, [defencesActive]);

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
            aria-label="start arp spoofing simulation"
          >
            Simulate
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-red-600 rounded"
            onClick={stopSpoof}
            aria-label="stop arp spoofing simulation"
          >
            Stop
          </button>
        )}
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:space-x-6 text-sm">
        <label className="inline-flex items-center space-x-2 mt-2 md:mt-0">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={staticArpEnabled}
            onChange={(e) => setStaticArpEnabled(e.target.checked)}
          />
          <span className="text-white">Static ARP entries (pin known MACs)</span>
        </label>
        <label className="inline-flex items-center space-x-2 mt-2 md:mt-0">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={dhcpSnoopingEnabled}
            onChange={(e) => setDhcpSnoopingEnabled(e.target.checked)}
          />
          <span className="text-white">DHCP snooping (filter rogue bindings)</span>
        </label>
      </div>
      <p className="mt-2 text-xs text-blue-300">{defenceStatusText}</p>
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
        {running && spoofBlockedBy.length === 0 && (
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
        {spoofBlockedBy.length > 0 && (
          <svg className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <line
              x1={lines.l1.x1}
              y1={lines.l1.y1}
              x2={lines.l1.x2}
              y2={lines.l1.y2}
              stroke="#f87171"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <line
              x1={(lines.l1.x1 + lines.l1.x2) / 2 - 6}
              y1={(lines.l1.y1 + lines.l1.y2) / 2 - 6}
              x2={(lines.l1.x1 + lines.l1.x2) / 2 + 6}
              y2={(lines.l1.y1 + lines.l1.y2) / 2 + 6}
              stroke="#f87171"
              strokeWidth="2"
            />
            <line
              x1={(lines.l1.x1 + lines.l1.x2) / 2 - 6}
              y1={(lines.l1.y1 + lines.l1.y2) / 2 + 6}
              x2={(lines.l1.x1 + lines.l1.x2) / 2 + 6}
              y2={(lines.l1.y1 + lines.l1.y2) / 2 - 6}
              stroke="#f87171"
              strokeWidth="2"
            />
            <text
              x={(lines.l1.x1 + lines.l1.x2) / 2}
              y={(lines.l1.y1 + lines.l1.y2) / 2 - 8}
              fill="#f87171"
              textAnchor="middle"
              className="text-xs"
            >
              blocked
            </text>
            <line
              x1={lines.l2.x1}
              y1={lines.l2.y1}
              x2={lines.l2.x2}
              y2={lines.l2.y2}
              stroke="#f87171"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <line
              x1={(lines.l2.x1 + lines.l2.x2) / 2 - 6}
              y1={(lines.l2.y1 + lines.l2.y2) / 2 - 6}
              x2={(lines.l2.x1 + lines.l2.x2) / 2 + 6}
              y2={(lines.l2.y1 + lines.l2.y2) / 2 + 6}
              stroke="#f87171"
              strokeWidth="2"
            />
            <line
              x1={(lines.l2.x1 + lines.l2.x2) / 2 - 6}
              y1={(lines.l2.y1 + lines.l2.y2) / 2 + 6}
              x2={(lines.l2.x1 + lines.l2.x2) / 2 + 6}
              y2={(lines.l2.y1 + lines.l2.y2) / 2 - 6}
              stroke="#f87171"
              strokeWidth="2"
            />
            <text
              x={(lines.l2.x1 + lines.l2.x2) / 2}
              y={(lines.l2.y1 + lines.l2.y2) / 2 - 8}
              fill="#f87171"
              textAnchor="middle"
              className="text-xs"
            >
              blocked
            </text>
          </svg>
        )}
        {spoofBlockedBy.length > 0 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center pointer-events-none">
            <div className="bg-red-900/70 border border-red-500 px-3 py-1 rounded text-sm">
              Forged ARP replies blocked by {blockedMessage || 'defences'}.
            </div>
          </div>
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
        <h2 className="font-semibold">Lab Storyboard</h2>
        <canvas
          ref={boardRef}
          width={300}
          height={200}
          className="bg-gray-800 rounded mt-2 cursor-move"
        />
        <div className="mt-2 space-x-2">
          <button
            className="px-2 py-1 bg-blue-600 rounded"
            onClick={nextStep}
          >
            Next Step
          </button>
          <button
            className="px-2 py-1 bg-gray-600 rounded"
            onClick={restartLab}
          >
            Restart Lab
          </button>
        </div>
        <p className="mt-2 text-xs text-blue-300">{storyboardStatus}</p>
        <div className="mt-2 text-xs font-mono">
          {steps[step].packetTrace.slice(0, traceIndex).map((p, i) => (
            <div key={i}>{p}</div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row md:space-x-8 mt-4">
          <div className="flex flex-col items-center">
            <h3 className="mb-2">Before</h3>
            {renderMini(steps[step].before)}
          </div>
          <div className="flex flex-col items-center mt-4 md:mt-0">
            <h3 className="mb-2">After</h3>
            {renderMini(steps[step].after)}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h2 className="font-semibold">Host Pairs</h2>
        <canvas
          ref={canvasRef}
          width={300}
          height={200}
          className="bg-gray-800 rounded mt-2"
        />
        <div className="text-xs mt-2">
          {flows[flowIndex]
            ? `Traffic ${flows[flowIndex].source} → ${flows[flowIndex].destination} (${flows[flowIndex].protocol})`
            : ''}
        </div>
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
              <th scope="col" className="border-b px-2 py-1">
                Vendor
              </th>
            </tr>
          </thead>
          <tbody>
            {arpEntries.map(({ ip, mac, vendor }) => (
              <tr key={ip}>
                <td className="px-2 py-1 font-mono">{ip}</td>
                <td className="px-2 py-1 font-mono">{mac}</td>
                <td className="px-2 py-1">{vendor}</td>
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
      <div className="mt-4">
        <h2 className="font-semibold">Filter Editor</h2>
        <select
          className="mt-2 p-1 rounded text-black"
          onChange={(e) => setFilterText(filterExamples[e.target.value])}
        >
          {Object.keys(filterExamples).map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <textarea
          className="w-full h-24 mt-2 p-2 rounded text-black font-mono"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <pre
          className="mt-2 p-2 bg-gray-800 rounded overflow-auto text-xs font-mono"
          aria-label="syntax highlighted filter"
        >
          <code
            dangerouslySetInnerHTML={{ __html: highlightFilter(filterText) }}
          />
        </pre>
      </div>
      <ArpLab
        staticArpEnabled={staticArpEnabled}
        dhcpSnoopingEnabled={dhcpSnoopingEnabled}
      />
      <div className="mt-4 text-xs bg-gray-800 p-2 rounded">
        <p>
          ARP poisoning works by sending forged Address Resolution Protocol
          replies to the victim and gateway so they associate the attacker&rsquo;s MAC
          address with each other&rsquo;s IP. This lets the attacker intercept the
          traffic between them.
        </p>
        <p className="mt-2">{mitigationExplainer}</p>
        <p className="mt-2 text-blue-300">{storyboardStatus}</p>
        <p className="mt-2">
          Learn more at{' '}
          <a
            href="https://www.ettercap-project.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            the official Ettercap site
          </a>
          , which supports a plugin model so extensions can inspect or modify
          captured packets without altering the core application.
        </p>
        <p className="mt-2">
          This interface is a simulation only and does not execute real network
          attacks.
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

