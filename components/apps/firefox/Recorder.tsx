import React, {
  ForwardedRef,
  MutableRefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

const CONTROL_ATTRIBUTE = 'data-firefox-recorder-control';
const RECORDER_ID_ATTRIBUTE = 'data-firefox-recorder-id';
const MACRO_NAMESPACE = 'firefox.macro';
const SUPPORTED_MAJOR_VERSION = 1;

export const MACRO_VERSION = `${MACRO_NAMESPACE}/1.0.0` as const;

const cssEscape = (value: string) => {
  if (typeof (globalThis as any).CSS !== 'undefined' && typeof (globalThis as any).CSS.escape === 'function') {
    return (globalThis as any).CSS.escape(value);
  }
  return value.replace(/([\0-\x1f\x7f-\x9f!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
};

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    const timeout = globalThis.setTimeout(() => {
      resolve();
    }, ms);
    if (typeof timeout === 'object' && 'unref' in timeout && typeof timeout.unref === 'function') {
      timeout.unref();
    }
  });

const now = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

let descriptorCounter = 0;

const createDescriptorId = () => {
  descriptorCounter += 1;
  return `ff-rec-${descriptorCounter}`;
};

type MacroEventType = 'click' | 'input' | 'change' | 'keydown' | 'keyup' | 'submit';

type MacroEventTargetDescriptor = {
  dataSelector?: string;
  path: string;
  text?: string | null;
};

type MacroEvent = {
  type: MacroEventType;
  timestamp: number;
  target: MacroEventTargetDescriptor;
  value?: string;
  checked?: boolean;
  key?: string;
  code?: string;
  pointer?: {
    button: number;
  };
  modifiers?: {
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
  };
};

export type FirefoxMacroEvent = MacroEvent;

export type FirefoxMacro = {
  version: typeof MACRO_VERSION;
  createdAt: string;
  duration: number;
  events: FirefoxMacroEvent[];
  metadata: {
    eventCount: number;
    notes?: string;
  };
};

type RecorderStatus = 'idle' | 'recording' | 'playing';

export type MacroPlaybackResult = {
  successCount: number;
  failureCount: number;
  skippedCount: number;
  accuracy: number;
  duration: number;
};

type PlayMacroOptions = {
  playbackRate?: number;
  waitForElementTimeout?: number;
  signal?: AbortSignal;
  onEvent?: (event: FirefoxMacroEvent, result: 'played' | 'skipped' | 'failed', detail?: string) => void;
};

const defaultPlayOptions: Required<Omit<PlayMacroOptions, 'signal' | 'onEvent'>> = {
  playbackRate: 1,
  waitForElementTimeout: 2000,
};

const parseVersion = (value: string) => {
  const [namespace, semver] = value.split('/');
  if (!namespace || !semver) {
    throw new Error('Invalid macro version format.');
  }
  const [majorStr] = semver.split('.');
  const major = Number.parseInt(majorStr, 10);
  if (Number.isNaN(major)) {
    throw new Error('Invalid macro version number.');
  }
  return { namespace, major };
};

export const serializeMacro = (macro: FirefoxMacro) => JSON.stringify(macro, null, 2);

export const parseMacro = (input: string): FirefoxMacro => {
  const candidate = JSON.parse(input) as Partial<FirefoxMacro>;
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Macro payload is not an object.');
  }
  if (typeof candidate.version !== 'string') {
    throw new Error('Macro payload is missing a version tag.');
  }
  const { namespace, major } = parseVersion(candidate.version);
  if (namespace !== MACRO_NAMESPACE) {
    throw new Error(`Unsupported macro namespace: ${namespace}`);
  }
  if (major !== SUPPORTED_MAJOR_VERSION) {
    throw new Error(`Incompatible macro version: ${candidate.version}`);
  }
  if (!Array.isArray(candidate.events)) {
    throw new Error('Macro payload is missing event data.');
  }
  return {
    version: MACRO_VERSION,
    createdAt: candidate.createdAt ?? new Date().toISOString(),
    duration: candidate.duration ?? 0,
    events: candidate.events as FirefoxMacroEvent[],
    metadata: {
      eventCount: candidate.metadata?.eventCount ?? candidate.events.length,
      notes: candidate.metadata?.notes,
    },
  };
};

const buildPath = (element: Element, root: Element): string => {
  const segments: string[] = [];
  let current: Element | null = element;
  while (current && current !== root) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${cssEscape(current.id)}`;
      segments.unshift(selector);
      break;
    }
    const classList = Array.from(current.classList || []).slice(0, 3);
    if (classList.length > 0) {
      selector += classList.map((className) => `.${cssEscape(className)}`).join('');
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((child) => (child as Element).tagName === current.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    segments.unshift(selector);
    current = current.parentElement;
  }
  return segments.join(' > ');
};

const ensureDescriptor = (element: Element, root: Element): MacroEventTargetDescriptor | null => {
  if (!root.contains(element)) {
    return null;
  }
  const descriptor: MacroEventTargetDescriptor = {
    path: buildPath(element, root),
    text: element.textContent?.trim().slice(0, 120) ?? null,
  };
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    const existing = element.getAttribute(RECORDER_ID_ATTRIBUTE);
    if (existing) {
      descriptor.dataSelector = `[${RECORDER_ID_ATTRIBUTE}="${existing}"]`;
    } else if (element instanceof HTMLElement) {
      const id = createDescriptorId();
      element.setAttribute(RECORDER_ID_ATTRIBUTE, id);
      descriptor.dataSelector = `[${RECORDER_ID_ATTRIBUTE}="${id}"]`;
    }
  }
  return descriptor;
};

const queryTarget = (root: HTMLElement, descriptor: MacroEventTargetDescriptor): HTMLElement | null => {
  if (descriptor.dataSelector) {
    const byData = root.querySelector(descriptor.dataSelector);
    if (byData instanceof HTMLElement) {
      return byData;
    }
  }
  if (descriptor.path) {
    const byPath = root.querySelector(descriptor.path);
    if (byPath instanceof HTMLElement) {
      return byPath;
    }
    if (descriptor.text) {
      const candidates = Array.from(root.querySelectorAll(descriptor.path));
      const match = candidates.find((candidate) => candidate.textContent?.trim() === descriptor.text);
      if (match instanceof HTMLElement) {
        return match;
      }
    }
  }
  if (descriptor.text) {
    const textMatch = Array.from(root.querySelectorAll('*')).find(
      (candidate) => candidate.textContent?.trim() === descriptor.text,
    );
    if (textMatch instanceof HTMLElement) {
      return textMatch;
    }
  }
  return null;
};

const waitForTarget = async (
  root: HTMLElement,
  descriptor: MacroEventTargetDescriptor,
  timeout: number,
  signal?: AbortSignal,
): Promise<HTMLElement | null> => {
  const existing = queryTarget(root, descriptor);
  if (existing) {
    return existing;
  }
  const start = now();
  return new Promise<HTMLElement | null>((resolve) => {
    let settled = false;
    const attempt = () => {
      if (settled) {
        return;
      }
      if (signal?.aborted) {
        settled = true;
        cleanup();
        resolve(null);
        return;
      }
      const candidate = queryTarget(root, descriptor);
      if (candidate) {
        settled = true;
        cleanup();
        resolve(candidate);
        return;
      }
      if (now() - start >= timeout) {
        settled = true;
        cleanup();
        resolve(null);
      }
    };
    const observer = new MutationObserver(() => attempt());
    observer.observe(root, { childList: true, subtree: true, attributes: true });
    const interval = globalThis.setInterval(() => attempt(), 16);
    const cleanup = () => {
      observer.disconnect();
      globalThis.clearInterval(interval);
    };
    if (signal) {
      signal.addEventListener('abort', () => {
        settled = true;
        cleanup();
        resolve(null);
      });
    }
    attempt();
  });
};

const dispatchMacroEvent = (target: HTMLElement, event: FirefoxMacroEvent) => {
  switch (event.type) {
    case 'click': {
      const pointer = event.pointer ?? { button: 0 };
      const mouseEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: pointer.button ?? 0,
      });
      target.dispatchEvent(mouseEvent);
      break;
    }
    case 'input':
    case 'change': {
      if ('value' in target && typeof event.value === 'string') {
        (target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = event.value;
      }
      if ('checked' in target && typeof event.checked === 'boolean') {
        (target as HTMLInputElement).checked = event.checked;
      }
      const inputEvent = new Event(event.type, {
        bubbles: true,
        cancelable: event.type === 'change',
      });
      target.dispatchEvent(inputEvent);
      break;
    }
    case 'keydown':
    case 'keyup': {
      const modifiers = event.modifiers ?? {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      };
      const keyboardEvent = new KeyboardEvent(event.type, {
        bubbles: true,
        cancelable: true,
        key: event.key,
        code: event.code,
        altKey: modifiers.altKey,
        ctrlKey: modifiers.ctrlKey,
        metaKey: modifiers.metaKey,
        shiftKey: modifiers.shiftKey,
      });
      target.dispatchEvent(keyboardEvent);
      break;
    }
    case 'submit': {
      const form = target instanceof HTMLFormElement ? target : target.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
      break;
    }
    default:
      break;
  }
};

export const playMacro = async (
  root: HTMLElement,
  macro: FirefoxMacro,
  options: PlayMacroOptions = {},
): Promise<MacroPlaybackResult> => {
  const mergedOptions = { ...defaultPlayOptions, ...options };
  const { playbackRate, waitForElementTimeout, signal, onEvent } = mergedOptions;
  const result: MacroPlaybackResult = {
    successCount: 0,
    failureCount: 0,
    skippedCount: 0,
    accuracy: 1,
    duration: macro.duration,
  };
  if (macro.events.length === 0) {
    return result;
  }
  const effectiveRate = playbackRate <= 0 ? 1 : playbackRate;
  let lastTimestamp = 0;
  for (const event of macro.events) {
    if (signal?.aborted) {
      result.skippedCount += 1;
      onEvent?.(event, 'skipped', 'Playback aborted');
      continue;
    }
    const waitTime = Math.max(0, event.timestamp - lastTimestamp);
    await delay(waitTime / effectiveRate);
    lastTimestamp = event.timestamp;
    const target = await waitForTarget(root, event.target, waitForElementTimeout / effectiveRate, signal);
    if (!target) {
      result.failureCount += 1;
      onEvent?.(event, 'failed', 'Target not found');
      continue;
    }
    dispatchMacroEvent(target, event);
    result.successCount += 1;
    onEvent?.(event, 'played');
  }
  const playedEvents = result.successCount + result.failureCount;
  result.accuracy = playedEvents === 0 ? 1 : result.successCount / playedEvents;
  return result;
};

type RecorderProps = {
  targetRef: MutableRefObject<HTMLElement | null>;
  className?: string;
};

export type RecorderHandle = {
  start: () => void;
  stop: () => FirefoxMacro | null;
  play: () => Promise<MacroPlaybackResult>;
  getMacro: () => FirefoxMacro | null;
  loadFromJSON: (payload: string) => void;
  exportToJSON: () => string | null;
};

const isControlElement = (element: Element | null) => {
  if (!element) {
    return false;
  }
  return Boolean(element.closest(`[${CONTROL_ATTRIBUTE}]`));
};

const useRecorderHandlers = (
  targetRef: MutableRefObject<HTMLElement | null>,
  controlsRef: MutableRefObject<HTMLDivElement | null>,
) => {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [macro, setMacro] = useState<FirefoxMacro | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [macroDraft, setMacroDraft] = useState('');
  const [playbackReport, setPlaybackReport] = useState<MacroPlaybackResult | null>(null);
  const eventsRef = useRef<FirefoxMacroEvent[]>([]);
  const startRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const statusRef = useRef<RecorderStatus>('idle');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const finaliseMacro = useCallback((): FirefoxMacro | null => {
    if (!startRef.current) {
      return null;
    }
    const events = eventsRef.current.slice();
    const duration = events.length > 0 ? events[events.length - 1].timestamp : 0;
    const result: FirefoxMacro = {
      version: MACRO_VERSION,
      createdAt: new Date().toISOString(),
      duration,
      events,
      metadata: {
        eventCount: events.length,
      },
    };
    return result;
  }, []);

  const stopRecording = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (status !== 'recording') {
      return null;
    }
    setStatus('idle');
    const finalMacro = finaliseMacro();
    if (finalMacro) {
      setMacro(finalMacro);
      setMacroDraft(serializeMacro(finalMacro));
    }
    startRef.current = null;
    return finalMacro ?? null;
  }, [finaliseMacro, status]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  const recordEvent = useCallback(
    (event: Event, type: MacroEventType) => {
      const root = targetRef.current;
      if (!root || statusRef.current !== 'recording') {
        return;
      }
      const target = event.target as Element | null;
      if (!target || !root.contains(target)) {
        return;
      }
      if (isControlElement(target) || (controlsRef.current && controlsRef.current.contains(target))) {
        return;
      }
      const descriptor = ensureDescriptor(target, root);
      if (!descriptor) {
        return;
      }
      if (!startRef.current) {
        startRef.current = now();
      }
      const timestamp = now() - (startRef.current ?? 0);
      const modifiers = (event as KeyboardEvent | MouseEvent) ?? null;
      const macroEvent: FirefoxMacroEvent = {
        type,
        timestamp,
        target: descriptor,
      };
      if (type === 'click') {
        const pointer = event as MouseEvent;
        macroEvent.pointer = {
          button: pointer.button ?? 0,
        };
      }
      if (type === 'input' || type === 'change') {
        const field = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (typeof field.value !== 'undefined') {
          macroEvent.value = field.value;
        }
        if ('checked' in field) {
          macroEvent.checked = Boolean((field as HTMLInputElement).checked);
        }
      }
      if (type === 'keydown' || type === 'keyup') {
        const keyboard = event as KeyboardEvent;
        macroEvent.key = keyboard.key;
        macroEvent.code = keyboard.code;
        macroEvent.modifiers = {
          altKey: keyboard.altKey,
          ctrlKey: keyboard.ctrlKey,
          metaKey: keyboard.metaKey,
          shiftKey: keyboard.shiftKey,
        };
      }
      eventsRef.current = [...eventsRef.current, macroEvent];
    },
    [controlsRef, targetRef],
  );

  const startRecording = useCallback(() => {
    const root = targetRef.current;
    if (!root) {
      setError('Recorder target is not mounted.');
      return;
    }
    if (status === 'recording') {
      return;
    }
    setError(null);
    setMessage(null);
    setPlaybackReport(null);
    eventsRef.current = [];
    startRef.current = now();
    const listenerMap: Array<[keyof GlobalEventHandlersEventMap, EventListener]> = [
      ['click', (event) => recordEvent(event, 'click')],
      ['input', (event) => recordEvent(event, 'input')],
      ['change', (event) => recordEvent(event, 'change')],
      ['keydown', (event) => recordEvent(event, 'keydown')],
      ['keyup', (event) => recordEvent(event, 'keyup')],
      ['submit', (event) => recordEvent(event, 'submit')],
    ];
    listenerMap.forEach(([eventName, handler]) => {
      root.addEventListener(eventName, handler, true);
    });
    cleanupRef.current = () => {
      listenerMap.forEach(([eventName, handler]) => {
        root.removeEventListener(eventName, handler, true);
      });
    };
    setStatus('recording');
  }, [recordEvent, status, targetRef]);

  const play = useCallback(async () => {
    const root = targetRef.current;
    if (!root || !macro) {
      throw new Error('No macro available for playback.');
    }
    setStatus('playing');
    setMessage(null);
    setError(null);
    const report = await playMacro(root, macro);
    setPlaybackReport(report);
    setStatus('idle');
    if (report.accuracy >= 0.95) {
      setMessage(`Playback completed with ${(report.accuracy * 100).toFixed(1)}% fidelity.`);
    } else {
      setError(`Playback fidelity below threshold: ${(report.accuracy * 100).toFixed(1)}%`);
    }
    return report;
  }, [macro, targetRef]);

  const importFromDraft = useCallback(() => {
    try {
      const parsed = parseMacro(macroDraft);
      setMacro(parsed);
      setMacroDraft(serializeMacro(parsed));
      setError(null);
      setMessage('Macro imported successfully.');
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Failed to import macro.');
    }
  }, [macroDraft]);

  const exportMacro = useCallback(async () => {
    if (!macro) {
      setError('No macro available to export.');
      return;
    }
    const payload = serializeMacro(macro);
    setMacroDraft(payload);
    try {
      if (navigator?.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(payload);
        setMessage('Macro copied to clipboard.');
        return;
      }
    } catch (clipboardError) {
      setError(clipboardError instanceof Error ? clipboardError.message : 'Failed to copy macro.');
      return;
    }
    setMessage('Clipboard unavailable. Macro JSON updated below.');
  }, [macro]);

  const loadFromJSON = useCallback(
    (payload: string) => {
      const parsed = parseMacro(payload);
      setMacro(parsed);
      setMacroDraft(serializeMacro(parsed));
    },
    [],
  );

  return {
    status,
    macro,
    macroDraft,
    setMacroDraft,
    startRecording,
    stopRecording,
    play,
    error,
    message,
    importFromDraft,
    exportMacro,
    loadFromJSON,
    playbackReport,
  };
};

const RecorderInner = (
  { targetRef, className }: RecorderProps,
  ref: ForwardedRef<RecorderHandle>,
) => {
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const {
    status,
    macro,
    macroDraft,
    setMacroDraft,
    startRecording,
    stopRecording,
    play,
    error,
    message,
    importFromDraft,
    exportMacro,
    loadFromJSON,
    playbackReport,
  } = useRecorderHandlers(targetRef, controlsRef as MutableRefObject<HTMLDivElement | null>);

  useImperativeHandle(
    ref,
    () => ({
      start: startRecording,
      stop: () => stopRecording(),
      play,
      getMacro: () => macro,
      loadFromJSON,
      exportToJSON: () => (macro ? serializeMacro(macro) : null),
    }),
    [loadFromJSON, macro, play, startRecording, stopRecording],
  );

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'recording':
        return 'Recording';
      case 'playing':
        return 'Replaying';
      default:
        return 'Idle';
    }
  }, [status]);

  return (
    <div
      ref={controlsRef}
      className={`pointer-events-auto absolute bottom-3 right-3 z-20 w-80 max-w-full rounded-md border border-gray-700 bg-gray-900/95 p-4 text-xs text-gray-100 shadow-lg ${
        className ?? ''
      }`}
      {...{ [CONTROL_ATTRIBUTE]: true }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Macro Recorder</h3>
        <span className="rounded bg-gray-800 px-2 py-1 text-[11px] uppercase tracking-wider text-gray-300">{statusLabel}</span>
      </div>
      <p className="mt-2 text-[11px] text-gray-400">
        Record Firefox simulation interactions and replay them later. Macros are versioned as {MACRO_VERSION}.
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          onClick={startRecording}
          disabled={status === 'recording'}
          className="rounded bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-900"
        >
          Start recording
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={status !== 'recording'}
          className="rounded bg-gray-700 px-3 py-1 font-medium text-gray-200 hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-800"
        >
          Stop
        </button>
        <button
          type="button"
          onClick={play}
          disabled={!macro || status === 'recording'}
          className="rounded bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900"
        >
          Replay macro
        </button>
        <button
          type="button"
          onClick={exportMacro}
          disabled={!macro}
          className="rounded bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-900"
        >
          Export
        </button>
      </div>
      <label htmlFor="firefox-recorder-macro" className="mt-3 block text-[11px] font-semibold text-gray-300">
        Macro JSON
      </label>
      <textarea
        id="firefox-recorder-macro"
        aria-label="Macro JSON"
        value={macroDraft}
        onChange={(event) => setMacroDraft(event.target.value)}
        className="mt-1 h-32 w-full rounded border border-gray-700 bg-gray-950 px-2 py-2 font-mono text-[11px] text-gray-200 focus:border-blue-500 focus:outline-none"
        placeholder="Macro JSON will appear here after recording."
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={importFromDraft}
          className="rounded bg-gray-700 px-3 py-1 font-medium text-gray-200 hover:bg-gray-600"
        >
          Import
        </button>
        <button
          type="button"
          onClick={() => {
            setMacroDraft('');
          }}
          className="rounded bg-gray-800 px-3 py-1 font-medium text-gray-200 hover:bg-gray-700"
        >
          Clear draft
        </button>
      </div>
      {playbackReport ? (
        <p className="mt-2 text-[11px] text-gray-400">
          Last replay fidelity: {(playbackReport.accuracy * 100).toFixed(1)}% ({playbackReport.successCount} succeeded,
          {` ${playbackReport.failureCount}`} failed).
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 text-[11px] text-emerald-400" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

const Recorder = React.forwardRef<RecorderHandle, RecorderProps>(RecorderInner);

export default Recorder;
