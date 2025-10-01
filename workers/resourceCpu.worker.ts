const ctx: DedicatedWorkerGlobalScope = self as any;

interface UpdateLoadMessage {
  type: 'updateLoad';
  running: number;
  maxParallel: number;
}

interface StartMessage {
  type: 'start';
  interval?: number;
}

interface StopMessage {
  type: 'stop';
}

type IncomingMessage = UpdateLoadMessage | StartMessage | StopMessage;

type MetricsMessage = {
  type: 'metrics';
  cpu: number;
};

let runningJobs = 0;
let maxParallel = 1;
let currentUsage = 18;
let targetUsage = 18;
let timer: ReturnType<typeof setInterval> | null = null;
let intervalMs = 1000;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const computeTarget = () => {
  const loadRatio = maxParallel > 0 ? runningJobs / maxParallel : runningJobs > 0 ? 1 : 0;
  const base = 18 + loadRatio * 65;
  const noise = (Math.random() - 0.5) * 12;
  targetUsage = clamp(base + noise, 8, 97);
};

const tick = () => {
  const delta = targetUsage - currentUsage;
  currentUsage = clamp(currentUsage + delta * 0.25 + (Math.random() - 0.5) * 2.5, 0, 99);
  const payload: MetricsMessage = {
    type: 'metrics',
    cpu: Number(currentUsage.toFixed(1)),
  };
  ctx.postMessage(payload);
};

const start = () => {
  if (timer) return;
  timer = setInterval(tick, intervalMs);
};

const stop = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

ctx.addEventListener('message', (event: MessageEvent<IncomingMessage>) => {
  const data = event.data;
  if (!data) return;
  switch (data.type) {
    case 'start':
      intervalMs = typeof data.interval === 'number' ? data.interval : 1000;
      start();
      break;
    case 'stop':
      stop();
      break;
    case 'updateLoad':
      runningJobs = data.running;
      maxParallel = Math.max(1, data.maxParallel);
      computeTarget();
      break;
    default:
      break;
  }
});

export {};
