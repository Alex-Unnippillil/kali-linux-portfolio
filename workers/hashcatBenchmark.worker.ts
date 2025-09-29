import type {
  BenchmarkStartPayload,
  BenchmarkWorkerIncomingMessage,
  BenchmarkWorkerOutgoingMessage,
} from '../apps/hashcat/worker-types';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

let timer: ReturnType<typeof setInterval> | null = null;
let activeScenario = 'benchmark';
let peakSpeed = 0;

const clearTimer = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

const formatEta = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const send = (message: BenchmarkWorkerOutgoingMessage) => {
  ctx.postMessage(message);
};

const handleStop = () => {
  const scenario = activeScenario;
  clearTimer();
  send({ type: 'stopped', scenario });
};

const startBenchmark = (config: BenchmarkStartPayload) => {
  clearTimer();
  activeScenario = config.scenario;
  peakSpeed = 0;

  const startTime = Date.now();
  const stepSize = 100 / Math.max(config.steps, 1);
  const interval = Math.max(Math.floor(config.durationMs / Math.max(config.steps, 1)), 200);
  let progress = 0;
  let step = 0;

  timer = setInterval(() => {
    step += 1;
    progress = Math.min(100, progress + stepSize);
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(config.durationMs - elapsed, 0);
    const speedRange = config.speedRange;
    const speed = Math.round(
      speedRange[0] + Math.random() * (speedRange[1] - speedRange[0])
    );
    peakSpeed = Math.max(peakSpeed, speed);

    const recovered = Math.min(
      config.recoveredHashes,
      Math.round((config.recoveredHashes * progress) / 100),
    );

    const logIndex = step % config.sampleLogs.length;
    const log = config.sampleLogs[logIndex] || `Processing chunk ${step}`;

    send({
      type: 'progress',
      progress,
      eta: formatEta(remaining),
      speed,
      recovered,
      log,
      scenario: config.scenario,
    });

    if (progress >= 100) {
      clearTimer();
      send({
        type: 'complete',
        recovered: config.recoveredHashes,
        summary: `Completed ${config.scenario} preset — peak ${peakSpeed} MH/s`,
        scenario: config.scenario,
      });
    }
  }, interval);
};

ctx.onmessage = ({ data }: MessageEvent<BenchmarkWorkerIncomingMessage>) => {
  if (data.type === 'start') {
    startBenchmark(data.payload);
    return;
  }

  if (data.type === 'stop') {
    handleStop();
  }
};

export {};
