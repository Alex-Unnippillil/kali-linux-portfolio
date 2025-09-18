import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import data from './data.json';
import ArpLab from './components/ArpLab';
import vendors from '../kismet/oui.json';

const { arpTable, flows } = data;
const attackerMac = 'aa:aa:aa:aa:aa:aa';

const DEFAULT_GATEWAY_IP = arpTable[0]?.ip ?? '192.168.0.1';
const DEFAULT_VICTIM_IP = arpTable[1]?.ip ?? '192.168.0.2';
export const ARP_SIMULATION_TICK_MS = 1600;

const clampIndex = (value, length) => {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, value));
};

const deterministicMacFromIp = (ip) => {
  const ipv4Parts = ip
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part) && part >= 0 && part <= 255);
  let bytes = ipv4Parts.length >= 4 ? ipv4Parts : [];
  if (!bytes.length) {
    bytes = Array.from(ip).map((char, index) =>
      (char.charCodeAt(0) + index * 37) % 256
    );
  }
  while (bytes.length < 6) {
    bytes.push((bytes.length * 37 + 97) % 256);
  }
  return bytes
    .slice(0, 6)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join(':');
};

const vendorLookup = (mac, fallbackLabel = 'Unknown') => {
  const prefix = mac.slice(0, 8).toUpperCase();
  return vendors[prefix] || fallbackLabel;
};

const makeEntry = (ip, mac, fallbackLabel = 'Unknown') => ({
  ip,
  mac,
  vendor: vendorLookup(mac, fallbackLabel),
});

const cloneEntries = (entries) => entries.map((entry) => ({ ...entry }));

const simulationReducer = (state, action) => {
  switch (action.type) {
    case 'SCRUB_TO':
      return {
        index: clampIndex(action.index, action.length),
        playing: false,
      };
    case 'STEP':
      return {
        index: clampIndex(state.index + action.delta, action.length),
        playing: false,
      };
    case 'PLAY':
      return { ...state, playing: true };
    case 'PAUSE':
      return { ...state, playing: false };
    case 'AUTO_ADVANCE': {
      if (state.index >= action.length - 1) {
        return {
          index: clampIndex(action.length - 1, action.length),
          playing: false,
        };
      }
      return { index: state.index + 1, playing: true };
    }
    case 'PLAY_FROM_START':
      return { index: 0, playing: true };
    default:
      return state;
  }
};

const SIMULATION_INITIAL_STATE = { index: 0, playing: false };

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
  const [simulation, dispatchSimulation] = useReducer(
    simulationReducer,
    SIMULATION_INITIAL_STATE
  );
  const victimIp = target1 || DEFAULT_VICTIM_IP;
  const gatewayIp = target2 || DEFAULT_GATEWAY_IP;

  const baselineEntries = useMemo(() => {
    const seen = new Map();
    arpTable.forEach(({ ip, mac }) => {
      seen.set(ip, makeEntry(ip, mac));
    });
    if (!seen.has(victimIp)) {
      const mac = deterministicMacFromIp(victimIp);
      seen.set(victimIp, makeEntry(victimIp, mac, 'Simulated Device'));
    }
    if (!seen.has(gatewayIp)) {
      const mac = deterministicMacFromIp(gatewayIp);
      seen.set(gatewayIp, makeEntry(gatewayIp, mac, 'Simulated Device'));
    }
    return Array.from(seen.values()).sort((a, b) => a.ip.localeCompare(b.ip));
  }, [victimIp, gatewayIp]);

  const timeline = useMemo(() => {
    if (!baselineEntries.length) return [];
    const attackerVendor = vendorLookup(attackerMac, 'Attacker Device (spoofed)');
    const baseline = cloneEntries(baselineEntries);
    const victimPoisoned = cloneEntries(baselineEntries).map((entry) =>
      entry.ip === victimIp
        ? { ...entry, mac: attackerMac, vendor: attackerVendor }
        : entry
    );
    const gatewayPoisoned = cloneEntries(victimPoisoned).map((entry) =>
      entry.ip === gatewayIp
        ? { ...entry, mac: attackerMac, vendor: attackerVendor }
        : entry
    );
    const restored = cloneEntries(baselineEntries);

    return [
      {
        id: 'baseline',
        label: 'Normal discovery',
        caption: `Hosts learn each other normally, leaving ${victimIp} and ${gatewayIp} mapped to legitimate vendors.`,
        entries: baseline,
      },
      {
        id: 'poison-victim',
        label: 'Victim poisoned',
        caption: `A spoofed reply convinces ${victimIp} that ${gatewayIp} is at ${attackerMac}, diverting outbound traffic to the attacker.`,
        entries: victimPoisoned,
      },
      {
        id: 'poison-gateway',
        label: 'Gateway poisoned',
        caption: `${gatewayIp} updates its cache to the attacker MAC as well, giving the intruder a full man-in-the-middle position.`,
        entries: gatewayPoisoned,
      },
      {
        id: 'restored',
        label: 'Cache restored',
        caption: `Flushing the ARP cache reverts both hosts to their original vendors, removing the attacker from the path.`,
        entries: restored,
      },
    ];
  }, [baselineEntries, gatewayIp, victimIp]);

  const activeFrame =
    timeline[simulation.index] ?? timeline[0] ?? {
      id: 'empty',
      label: '',
      caption: '',
      entries: [],
    };
  const stageCount = timeline.length;
  const atStart = simulation.index === 0;
  const atEnd = stageCount > 0 && simulation.index >= stageCount - 1;

  const handlePlayToggle = () => {
    if (!stageCount) return;
    if (simulation.playing) {
      dispatchSimulation({ type: 'PAUSE' });
      return;
    }
    if (simulation.index >= stageCount - 1) {
      dispatchSimulation({ type: 'PLAY_FROM_START' });
    } else {
      dispatchSimulation({ type: 'PLAY' });
    }
  };

  const handleStep = (delta) => {
    if (!stageCount) return;
    dispatchSimulation({ type: 'STEP', delta, length: stageCount });
  };

  const handleScrub = (value) => {
    dispatchSimulation({
      type: 'SCRUB_TO',
      index: clampIndex(value, stageCount),
      length: stageCount,
    });
  };

  useEffect(() => {
    if (!simulation.playing || stageCount <= 1) return undefined;
    const id = setInterval(() => {
      dispatchSimulation({ type: 'AUTO_ADVANCE', length: stageCount });
    }, ARP_SIMULATION_TICK_MS);
    return () => clearInterval(id);
  }, [simulation.playing, stageCount]);

  useEffect(() => {
    if (!stageCount) return;
    if (simulation.index > stageCount - 1) {
      dispatchSimulation({
        type: 'SCRUB_TO',
        index: stageCount - 1,
        length: stageCount,
      });
    }
  }, [simulation.index, stageCount]);

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
        before: [{ from: 'Victim', to: 'Gateway', color: '#fbbf24' }],
        after: [{ from: 'Victim', to: 'Gateway', color: '#fbbf24' }],
      },
      {
        title: 'ARP Poisoning',
        packetTrace: [
          'Attacker -> Victim: ARP reply (gateway is-at attacker)',
          'Attacker -> Gateway: ARP reply (victim is-at attacker)',
        ],
        before: [{ from: 'Victim', to: 'Gateway', color: '#fbbf24' }],
        after: [
          { from: 'Victim', to: 'Attacker', color: '#fbbf24' },
          { from: 'Attacker', to: 'Gateway', color: '#fbbf24' },
        ],
      },
      {
        title: 'DNS Spoofing',
        packetTrace: [
          'Victim -> Attacker: DNS query',
          'Attacker -> Victim: spoofed DNS response',
        ],
        before: [
          { from: 'Victim', to: 'Attacker', color: '#fbbf24' },
          { from: 'Attacker', to: 'Gateway', color: '#fbbf24' },
        ],
        after: [
          { from: 'Victim', to: 'Attacker', color: '#fbbf24' },
          { from: 'Attacker', to: 'Gateway', color: '#f87171' },
        ],
      },
    ],
    []
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
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      if (i === 0) {
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
          const markerId = f.color === '#f87171' ? 'mini-arrow-red' : 'mini-arrow';
          return (
            <line
              key={i}
              x1={from.x + 30}
              y1={from.y}
              x2={to.x - 30}
              y2={to.y}
              stroke={f.color}
              strokeWidth="2"
              markerEnd={`url(#${markerId})`}
            />
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
    dispatchSimulation({ type: 'PLAY_FROM_START' });
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

  const stopSpoof = () => {
    cancelAnimationFrame(animationRef.current);
    clearInterval(logIntervalRef.current);
    setRunning(false);
    dispatchSimulation({ type: 'PAUSE' });
    setStatus('ARP spoofing simulation stopped');
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
        <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-xs font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={atStart || stageCount <= 1}
              data-testid="arp-prev"
            >
              ◀ Prev
            </button>
            <button
              type="button"
              onClick={handlePlayToggle}
              className="px-3 py-1 rounded bg-yellow-500 text-black text-xs font-semibold hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={stageCount <= 1}
              data-testid="arp-play-toggle"
            >
              {simulation.playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              onClick={() => handleStep(1)}
              className="px-2 py-1 rounded border border-gray-700 bg-gray-800 text-xs font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={atEnd || stageCount <= 1}
              data-testid="arp-next"
            >
              Next ▶
            </button>
          </div>
          <div className="flex flex-1 items-center gap-3">
            <input
              type="range"
              min="0"
              max={Math.max(stageCount - 1, 0)}
              step="1"
              value={stageCount ? simulation.index : 0}
              onChange={(e) => handleScrub(Number(e.target.value))}
              className="flex-1 accent-yellow-400"
              aria-label="ARP table timeline scrubber"
              aria-valuemin={0}
              aria-valuemax={Math.max(stageCount - 1, 0)}
              aria-valuenow={stageCount ? simulation.index : 0}
              aria-valuetext={stageCount ? activeFrame.label : 'No timeline frames'}
              disabled={!stageCount}
              data-testid="arp-scrubber"
            />
            <span className="text-xs font-mono text-gray-300">
              {stageCount ? `${simulation.index + 1}/${stageCount}` : '0/0'}
            </span>
          </div>
        </div>
        <div
          className="mt-2 rounded border border-gray-700 bg-gray-800 p-3 transition-colors"
          aria-live="polite"
        >
          {stageCount ? (
            <>
              <div className="text-sm font-semibold text-yellow-300">
                {`Step ${simulation.index + 1}: ${activeFrame.label}`}
              </div>
              <p className="mt-1 text-xs text-gray-300">{activeFrame.caption}</p>
            </>
          ) : (
            <p className="text-xs text-gray-300">No ARP data available.</p>
          )}
        </div>
        <table className="w-full text-left border-collapse mt-3">
          <caption className="sr-only">
            {stageCount
              ? `ARP entries at step ${simulation.index + 1} - ${activeFrame.label}`
              : 'ARP entries'}
          </caption>
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
          <tbody className="transition-colors">
            {activeFrame.entries.length ? (
              activeFrame.entries.map(({ ip, mac, vendor }) => {
                const spoofed = mac === attackerMac;
                return (
                  <tr
                    key={ip}
                    className={`transition-colors ${
                      spoofed ? 'bg-yellow-900/30' : ''
                    }`}
                  >
                    <td className="px-2 py-1 font-mono">{ip}</td>
                    <td className="px-2 py-1 font-mono">{mac}</td>
                    <td className="px-2 py-1">
                      {vendor}
                      {spoofed ? (
                        <span className="ml-2 text-[0.6rem] uppercase tracking-wide text-yellow-300">
                          spoofed
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={3}
                  className="px-2 py-3 text-center text-sm text-gray-400"
                >
                  No ARP entries available.
                </td>
              </tr>
            )}
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
      <ArpLab />
      <div className="mt-4 text-xs bg-gray-800 p-2 rounded">
        <p>
          ARP poisoning works by sending forged Address Resolution Protocol
          replies to the victim and gateway so they associate the attacker&rsquo;s MAC
          address with each other&rsquo;s IP. This lets the attacker intercept the
          traffic between them.
        </p>
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

