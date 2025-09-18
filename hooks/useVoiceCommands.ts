import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type VoiceCommandType =
  | 'open-app'
  | 'cycle-window'
  | 'cycle-instance'
  | 'close-window'
  | 'show-desktop'
  | 'dictation'
  | 'stop-listening'
  | 'start-listening'
  | 'confirm'
  | 'cancel';

export interface VoiceCommandEvent {
  type: VoiceCommandType;
  phrase: string;
  payload?: Record<string, unknown>;
  requiresConfirmation?: boolean;
}

interface UseVoiceCommandsOptions {
  enabled: boolean;
  appAliases?: Record<string, string>;
  requireConfirmation?: boolean;
  throttleMs?: number;
  modelUrl?: string;
  historyLimit?: number;
  onCommand?: (intent: VoiceCommandEvent) => void;
  onError?: (message: string) => void;
}

interface RecognitionMessage {
  result?: {
    text?: string;
    partial?: string;
  };
  error?: string;
}

type VoskModel = {
  KaldiRecognizer: new () => VoskRecognizer;
  ready?: boolean;
  on?: (event: string, handler: (message: RecognitionMessage) => void) => void;
  terminate?: () => void;
};

type VoskRecognizer = {
  on: (event: string, handler: (message: RecognitionMessage) => void) => void;
  acceptWaveform: (buffer: AudioBuffer) => void;
  setWords?: (value: boolean) => void;
  setGrammar?: (grammar: string[]) => void;
  remove?: () => void;
};

const DEFAULT_MODEL_URL = '/models/vosk-model-small-en-us-0.15.tar.gz';
const MOCK_EVENT_NAME = 'voice:mock-result';
const CONFIRM_PATTERNS = [/^(confirm|yes|do it|please do)$/i];
const CANCEL_PATTERNS = [/^(cancel|no|stop|never mind)$/i];
const STOP_PATTERNS = [/^(stop listening|disable voice)$/i];
const START_PATTERNS = [/^(start listening|enable voice)$/i];

const sanitizeAlias = (value: string) => value.trim().toLowerCase();

const resolveAlias = (target: string, aliases: Record<string, string>): string | null => {
  const normalized = sanitizeAlias(target);
  if (!normalized) return null;
  if (aliases[normalized]) return aliases[normalized];
  const entry = Object.entries(aliases).find(([key]) => normalized === key || normalized.endsWith(` ${key}`));
  if (entry) return entry[1];
  return null;
};

const nextHistory = (history: VoiceCommandEvent[], item: VoiceCommandEvent, limit: number) => {
  const items = [item, ...history];
  if (items.length > limit) {
    return items.slice(0, limit);
  }
  return items;
};

const useStableCallback = <T extends (...args: any[]) => unknown>(fn: T | undefined) => {
  const ref = useRef<T | undefined>(fn);
  useEffect(() => {
    ref.current = fn;
  }, [fn]);
  return useCallback((...args: Parameters<T>) => {
    if (ref.current) {
      return ref.current(...args);
    }
    return undefined;
  }, []);
};

export const useVoiceCommands = ({
  enabled,
  appAliases = {},
  requireConfirmation = true,
  throttleMs = 1200,
  modelUrl = DEFAULT_MODEL_URL,
  historyLimit = 6,
  onCommand,
  onError,
}: UseVoiceCommandsOptions) => {
  const [listening, setListening] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [history, setHistory] = useState<VoiceCommandEvent[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<VoiceCommandEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onCommandStable = useStableCallback(onCommand);
  const onErrorStable = useStableCallback(onError);

  const modelRef = useRef<VoskModel | null>(null);
  const recognizerRef = useRef<VoskRecognizer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingRef = useRef<VoiceCommandEvent | null>(null);
  const lastCommandRef = useRef<{ phrase: string; timestamp: number } | null>(null);
  const startListeningRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const handlePhraseRef = useRef<(phrase: string) => void>(() => {});

  const aliasMap = useMemo(() => {
    const lowerCase: Record<string, string> = {};
    Object.entries(appAliases).forEach(([key, value]) => {
      lowerCase[sanitizeAlias(key)] = value;
    });
    return lowerCase;
  }, [appAliases]);

  const emitError = useCallback(
    (message: string) => {
      setError(message);
      if (onErrorStable) {
        onErrorStable(message);
      }
    },
    [onErrorStable],
  );

  const destroyAudioGraph = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;

    sourceRef.current?.disconnect();
    sourceRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioContextRef.current) {
      const ctx = audioContextRef.current;
      ctx.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    destroyAudioGraph();
    setListening(false);
    setPartialTranscript('');
  }, [destroyAudioGraph]);

  const clearRecognition = useCallback(() => {
    recognizerRef.current?.remove?.();
    recognizerRef.current = null;
    modelRef.current?.terminate?.();
    modelRef.current = null;
  }, []);

  const handleIntent = useCallback(
    (intent: VoiceCommandEvent, options?: { bypassThrottle?: boolean; invokeCallback?: boolean }) => {
      const { bypassThrottle = false, invokeCallback = true } = options ?? {};
      const normalized = sanitizeAlias(intent.phrase);
      if (!bypassThrottle) {
        const now = Date.now();
        const last = lastCommandRef.current;
        if (last && last.phrase === normalized && now - last.timestamp < throttleMs) {
          return;
        }
        lastCommandRef.current = { phrase: normalized, timestamp: now };
      }
      setHistory((prev) => nextHistory(prev, intent, historyLimit));
      setTranscript(intent.phrase);

      if (intent.requiresConfirmation) {
        pendingRef.current = intent;
        setPendingConfirmation(intent);
        return;
      }

      if (intent.type === 'stop-listening') {
        stopListening();
        return;
      }

      if (invokeCallback) {
        onCommandStable?.(intent);
      }
    },
    [historyLimit, onCommandStable, stopListening, throttleMs],
  );

  const resolveAppFromTarget = useCallback(
    (target: string): string | null => resolveAlias(target, aliasMap),
    [aliasMap],
  );

  const parsePhrase = useCallback(
    (phrase: string): VoiceCommandEvent | null => {
      const normalized = phrase.trim();
      if (!normalized) return null;
      const lower = normalized.toLowerCase();

      if (pendingRef.current) {
        if (CONFIRM_PATTERNS.some((regex) => regex.test(normalized))) {
          return { type: 'confirm', phrase: normalized };
        }
        if (CANCEL_PATTERNS.some((regex) => regex.test(normalized))) {
          return { type: 'cancel', phrase: normalized };
        }
      }

      if (STOP_PATTERNS.some((regex) => regex.test(lower))) {
        return { type: 'stop-listening', phrase: normalized };
      }
      if (START_PATTERNS.some((regex) => regex.test(lower))) {
        return { type: 'start-listening', phrase: normalized };
      }

      const openMatch = lower.match(/^(?:open|launch|start|focus|switch to)\s+(?<target>.+)$/);
      if (openMatch && openMatch.groups?.target) {
        const appId = resolveAppFromTarget(openMatch.groups.target);
        if (appId) {
          return {
            type: 'open-app',
            phrase: normalized,
            payload: { appId, target: openMatch.groups.target },
          };
        }
      }

      if (/^(?:next|focus next|next window|switch window|switch next|cycle window)/.test(lower)) {
        return { type: 'cycle-window', phrase: normalized, payload: { direction: 'next' } };
      }

      if (/^(?:previous|focus previous|previous window|last window|cycle back)/.test(lower)) {
        return { type: 'cycle-window', phrase: normalized, payload: { direction: 'previous' } };
      }

      if (/^(?:next instance|cycle instance|switch instance)/.test(lower)) {
        return { type: 'cycle-instance', phrase: normalized, payload: { direction: 'next' } };
      }

      if (/^(?:previous instance|cycle prior instance)/.test(lower)) {
        return { type: 'cycle-instance', phrase: normalized, payload: { direction: 'previous' } };
      }

      if (/(?:close|quit|exit)\s+(?:window|app|application)$/.test(lower) || lower === 'close window') {
        return { type: 'close-window', phrase: normalized, requiresConfirmation: requireConfirmation };
      }

      if (/^(?:show|reveal|display)\s+(?:desktop|home)$/i.test(normalized) || lower === 'show desktop') {
        return { type: 'show-desktop', phrase: normalized };
      }

      const dictationMatch = lower.match(/^(?:type|dictate|insert)\s+(?<text>.+)$/);
      if (dictationMatch && dictationMatch.groups?.text) {
        return {
          type: 'dictation',
          phrase: normalized,
          payload: { text: dictationMatch.groups.text },
        };
      }

      if (CONFIRM_PATTERNS.some((regex) => regex.test(normalized))) {
        return { type: 'confirm', phrase: normalized };
      }

      if (CANCEL_PATTERNS.some((regex) => regex.test(normalized))) {
        return { type: 'cancel', phrase: normalized };
      }

      return null;
    },
    [requireConfirmation, resolveAppFromTarget],
  );

  const handlePhrase = useCallback(
    (phrase: string) => {
      setPartialTranscript('');
      const intent = parsePhrase(phrase);
      if (!intent) {
        setTranscript(phrase);
        return;
      }

      if (intent.type === 'confirm' && pendingRef.current) {
        const pending = pendingRef.current;
        pendingRef.current = null;
        setPendingConfirmation(null);
        handleIntent({ ...pending, requiresConfirmation: false }, { bypassThrottle: true });
        return;
      }

      if (intent.type === 'cancel' && pendingRef.current) {
        pendingRef.current = null;
        setPendingConfirmation(null);
        setHistory((prev) => nextHistory(prev, intent, historyLimit));
        setTranscript(intent.phrase);
        return;
      }

      if (intent.type === 'start-listening') {
        void startListeningRef.current?.();
        handleIntent(intent, { bypassThrottle: true, invokeCallback: false });
        return;
      }

      handleIntent(intent);
    },
    [handleIntent, historyLimit, parsePhrase],
  );

  handlePhraseRef.current = handlePhrase;

  const ensureModel = useCallback(async () => {
    if (typeof window === 'undefined') return null;
    if (modelRef.current) return modelRef.current;
    try {
      const voskModule: any = await import('vosk-browser');
      const model: VoskModel =
        typeof voskModule.createModel === 'function'
          ? await voskModule.createModel(modelUrl)
          : new voskModule.Model(modelUrl);

      if (model.ready === false && model.on) {
        await new Promise<void>((resolve, reject) => {
          model.on?.('load', (message: RecognitionMessage) => {
            if (message.result) {
              resolve();
            } else {
              reject(new Error('Voice model failed to load'));
            }
          });
          model.on?.('error', (message: RecognitionMessage) => {
            reject(new Error(message.error || 'Failed to load voice model'));
          });
        });
      }

      modelRef.current = model;
      return model;
    } catch (err) {
      emitError(err instanceof Error ? err.message : 'Unable to load offline model');
      return null;
    }
  }, [emitError, modelUrl]);

  const ensureRecognizer = useCallback(async () => {
    if (!modelRef.current) {
      await ensureModel();
    }
    const model = modelRef.current;
    if (!model) return null;
    if (recognizerRef.current) return recognizerRef.current;
    const recognizer = new model.KaldiRecognizer();
    recognizer.setWords?.(false);
    const aliasGrammar = Object.keys(aliasMap);
    if (recognizer.setGrammar && aliasGrammar.length) {
      recognizer.setGrammar([
        ...aliasGrammar,
        'open',
        'launch',
        'start',
        'focus',
        'switch',
        'next',
        'previous',
        'window',
        'close',
        'quit',
        'exit',
        'show',
        'desktop',
        'confirm',
        'cancel',
        'type',
        'dictate',
        'insert',
      ]);
    }

    recognizer.on('result', (message: RecognitionMessage) => {
      const text = message.result?.text?.trim();
      if (text) {
        handlePhraseRef.current(text);
      }
    });

    recognizer.on('partialresult', (message: RecognitionMessage) => {
      const text = message.result?.partial ?? '';
      setPartialTranscript(text);
    });

    recognizer.on('error', (message: RecognitionMessage) => {
      emitError(message.error || 'Voice recognition error');
    });

    recognizerRef.current = recognizer;
    return recognizer;
  }, [aliasMap, emitError, ensureModel]);

  const startListening = useCallback(async () => {
    if (initializing || listening) return;
    if (typeof window === 'undefined') return;
    setInitializing(true);
    setError(null);
    try {
      const recognizer = await ensureRecognizer();
      if (!recognizer) {
        setInitializing(false);
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = mediaStream;
      const AudioContextCtor = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
      if (!AudioContextCtor) {
        throw new Error('Web Audio API is not available');
      }
      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(mediaStream);
      sourceRef.current = source;
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        try {
          recognizer.acceptWaveform(event.inputBuffer);
        } catch (err) {
          console.error('acceptWaveform failed', err);
        }
      };
      source.connect(processor);
      processor.connect(audioContext.destination);
      setListening(true);
    } catch (err) {
      emitError(err instanceof Error ? err.message : 'Unable to access microphone');
      destroyAudioGraph();
    } finally {
      setInitializing(false);
    }
  }, [destroyAudioGraph, emitError, ensureRecognizer, initializing, listening]);

  const toggleListening = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      void startListening();
    }
  }, [listening, startListening, stopListening]);

  startListeningRef.current = startListening;

  const confirmPending = useCallback(() => {
    if (!pendingRef.current) return;
    const pending = pendingRef.current;
    pendingRef.current = null;
    setPendingConfirmation(null);
    handleIntent({ ...pending, requiresConfirmation: false }, { bypassThrottle: true });
  }, [handleIntent]);

  const cancelPending = useCallback(() => {
    pendingRef.current = null;
    setPendingConfirmation(null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopListening();
      setHistory([]);
      pendingRef.current = null;
      setPendingConfirmation(null);
    }
  }, [enabled, stopListening]);

  useEffect(() => {
    const handleMock = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === 'string') {
        handlePhrase(detail);
      }
    };
    window.addEventListener(MOCK_EVENT_NAME, handleMock);
    return () => {
      window.removeEventListener(MOCK_EVENT_NAME, handleMock);
    };
  }, [handlePhrase]);

  useEffect(
    () => () => {
      stopListening();
      clearRecognition();
    },
    [clearRecognition, stopListening],
  );

  return {
    listening,
    initializing,
    transcript,
    partialTranscript,
    history,
    pendingConfirmation,
    error,
    startListening,
    stopListening,
    toggleListening,
    confirmPending,
    cancelPending,
  };
};

export type UseVoiceCommandsReturn = ReturnType<typeof useVoiceCommands>;

export default useVoiceCommands;
