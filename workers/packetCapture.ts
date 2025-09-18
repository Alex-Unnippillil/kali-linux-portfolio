export {};

type StartPayload = {
  interface: string;
  filters: string[];
  saveToFile: boolean;
  acknowledgedElevation?: boolean;
};

type WorkerRequest =
  | { type: 'start'; payload: StartPayload }
  | { type: 'stop' };

const ctx: DedicatedWorkerGlobalScope =
  self as unknown as DedicatedWorkerGlobalScope;

const USER_STORAGE_DIR = '~/Documents/Captures';

const requiresElevation = (iface: string) => {
  const normalized = iface.trim().toLowerCase();
  return normalized !== 'lo';
};

const describeInterface = (iface: string) => {
  if (iface === 'any') return 'all interfaces';
  return iface;
};

const pad = (value: number) => value.toString().padStart(2, '0');

const formatTimestamp = (date: Date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}${pad(date.getSeconds())}`;

const sanitizeInterface = (value: string) => {
  const clean = value.trim().toLowerCase();
  const safe = clean.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return safe || 'any';
};

let captureInterval: ReturnType<typeof setInterval> | null = null;
let finalizeTimer: ReturnType<typeof setTimeout> | null = null;
let active = false;
let activeConfig: StartPayload | null = null;

const stopTimers = () => {
  if (captureInterval) {
    clearInterval(captureInterval);
    captureInterval = null;
  }
  if (finalizeTimer) {
    clearTimeout(finalizeTimer);
    finalizeTimer = null;
  }
};

const emitStatus = (
  status:
    | 'initializing'
    | 'capturing'
    | 'saving'
    | 'saved'
    | 'stopped'
    | 'error',
  message: string,
) => {
  ctx.postMessage({ type: 'status', payload: { status, message } });
};

const emitLog = (message: string) => {
  ctx.postMessage({ type: 'log', payload: message });
};

const finishCapture = (config: StartPayload) => {
  if (!active) return;
  if (config.saveToFile) {
    emitStatus('saving', 'Writing capture to storage...');
    finalizeTimer = setTimeout(() => {
      if (!active) return;
      const ifaceSlug = sanitizeInterface(config.interface || 'any');
      const timestamp = formatTimestamp(new Date());
      const filename = `capture-${ifaceSlug}-${timestamp}.pcap`;
      const path = `${USER_STORAGE_DIR}/${filename}`;
      emitLog(`Generated demo file ${filename}.`);
      ctx.postMessage({ type: 'saved', payload: { path, filename } });
      emitStatus('saved', `Capture saved to ${path}`);
      active = false;
      activeConfig = null;
      finalizeTimer = null;
    }, 800);
  } else {
    finalizeTimer = setTimeout(() => {
      if (!active) return;
      emitLog('Capture ended without saving to disk.');
      emitStatus('stopped', 'Capture finished (not saved).');
      active = false;
      activeConfig = null;
      finalizeTimer = null;
    }, 500);
  }
};

const handleStart = (payload: StartPayload) => {
  const iface = payload.interface?.trim() || 'any';
  const config: StartPayload = { ...payload, interface: iface };

  if (active) {
    emitLog('Received start request while another capture is running.');
    emitStatus(
      'error',
      'A capture session is already active. Stop it before starting a new one.',
    );
    return;
  }

  if (!config.acknowledgedElevation && requiresElevation(config.interface)) {
    activeConfig = config;
    ctx.postMessage({
      type: 'needsElevation',
      payload: {
        message: `Capturing on ${describeInterface(config.interface)} requires elevated privileges.`,
        command: 'sudo setcap cap_net_raw,cap_net_admin+eip $(which dumpcap)',
      },
    });
    return;
  }

  active = true;
  activeConfig = config;
  emitStatus(
    'initializing',
    `Initializing capture on ${describeInterface(config.interface)}...`,
  );

  const filterSummary = config.filters?.length
    ? config.filters.join(' OR ')
    : 'no filters (capture all traffic)';
  emitLog(`Applying ${filterSummary}.`);

  setTimeout(() => {
    if (!active) return;
    emitStatus(
      'capturing',
      `Capturing packets on ${describeInterface(config.interface)}.`,
    );
  }, 350);

  let batches = 0;
  captureInterval = setInterval(() => {
    if (!activeConfig || !active) return;
    batches += 1;
    emitLog(
      `Captured demo batch ${batches} on ${describeInterface(activeConfig.interface)}.`,
    );
    if (batches >= 4) {
      stopTimers();
      finishCapture(activeConfig);
    }
  }, 1200);
};

const handleStop = (message: string) => {
  if (!active) {
    activeConfig = null;
    emitStatus('stopped', message);
    return;
  }
  stopTimers();
  emitLog('Capture cancelled by user.');
  emitStatus('stopped', message);
  active = false;
  activeConfig = null;
};

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, payload } = event.data;
  if (type === 'start') {
    handleStart(payload);
    return;
  }
  if (type === 'stop') {
    handleStop('Capture stopped by user.');
  }
};
