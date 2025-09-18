import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {
  SimulatedDownloadController,
  createSimulatedDownload,
} from '../../modules/downloads/simulatedApi';

export type DownloadStatus = 'downloading' | 'paused' | 'completed' | 'failed';

export interface StartDownloadRequest {
  /** Optional custom identifier. A generated id will be used if omitted. */
  id?: string;
  /** Short label shown to the user. */
  label: string;
  /** Optional descriptor of where the download originated. */
  source?: string;
  /** Total size in bytes that the simulated transfer should complete. */
  totalBytes: number;
  /**
   * Optional chunk size override. If omitted, the simulation will transfer a
   * twentieth of the total size (min 1 byte) per interval.
   */
  chunkSize?: number;
  /** Interval between progress updates in milliseconds. Defaults to 250ms. */
  intervalMs?: number;
  /** Optional point (in bytes) where the simulation should fail. */
  failAtBytes?: number;
  /** Optional callback invoked on each progress update. */
  onProgress?: (downloadedBytes: number) => void;
  /** Optional callback invoked when the download completes. */
  onComplete?: () => void;
  /** Optional callback invoked when the download fails. */
  onError?: (error: Error) => void;
}

export interface DownloadItem {
  id: string;
  label: string;
  source?: string;
  status: DownloadStatus;
  bytesDownloaded: number;
  totalBytes: number;
  progress: number;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
}

interface DownloadCallbacks {
  onProgress?: (downloadedBytes: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

interface DownloadConfig {
  totalBytes: number;
  chunkSize?: number;
  intervalMs?: number;
  failAtBytes?: number;
}

interface DownloadsState {
  order: string[];
  items: Record<string, DownloadItem>;
}

const initialState: DownloadsState = {
  order: [],
  items: {},
};

type Action =
  | { type: 'ADD'; payload: DownloadItem }
  | { type: 'PROGRESS'; id: string; bytesDownloaded: number }
  | { type: 'PAUSE'; id: string }
  | { type: 'RESUME'; id: string }
  | { type: 'COMPLETE'; id: string; completedAt: number }
  | { type: 'FAIL'; id: string; error: string; at: number }
  | { type: 'RETRY'; id: string; startedAt: number }
  | { type: 'REMOVE'; id: string };

function downloadsReducer(state: DownloadsState, action: Action): DownloadsState {
  switch (action.type) {
    case 'ADD': {
      const nextOrder = [action.payload.id, ...state.order.filter(id => id !== action.payload.id)];
      return {
        order: nextOrder,
        items: {
          ...state.items,
          [action.payload.id]: action.payload,
        },
      };
    }
    case 'PROGRESS': {
      const item = state.items[action.id];
      if (!item || item.status === 'completed' || item.status === 'failed') {
        return state;
      }
      const bytes = Math.max(item.bytesDownloaded, Math.min(action.bytesDownloaded, item.totalBytes));
      const progress = item.totalBytes > 0 ? Math.min(1, bytes / item.totalBytes) : 0;
      const updated: DownloadItem = {
        ...item,
        bytesDownloaded: bytes,
        progress,
        status: 'downloading',
        updatedAt: Date.now(),
      };
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: updated,
        },
      };
    }
    case 'PAUSE': {
      const item = state.items[action.id];
      if (!item || item.status !== 'downloading') return state;
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: {
            ...item,
            status: 'paused',
            updatedAt: Date.now(),
          },
        },
      };
    }
    case 'RESUME': {
      const item = state.items[action.id];
      if (!item || item.status !== 'paused') return state;
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: {
            ...item,
            status: 'downloading',
            updatedAt: Date.now(),
          },
        },
      };
    }
    case 'COMPLETE': {
      const item = state.items[action.id];
      if (!item) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: {
            ...item,
            status: 'completed',
            bytesDownloaded: item.totalBytes,
            progress: 1,
            updatedAt: action.completedAt,
            completedAt: action.completedAt,
            error: undefined,
          },
        },
      };
    }
    case 'FAIL': {
      const item = state.items[action.id];
      if (!item) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: {
            ...item,
            status: 'failed',
            error: action.error,
            updatedAt: action.at,
          },
        },
      };
    }
    case 'RETRY': {
      const item = state.items[action.id];
      if (!item) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [action.id]: {
            ...item,
            status: 'downloading',
            bytesDownloaded: 0,
            progress: 0,
            error: undefined,
            startedAt: action.startedAt,
            updatedAt: action.startedAt,
            completedAt: undefined,
          },
        },
      };
    }
    case 'REMOVE': {
      if (!state.items[action.id]) return state;
      const { [action.id]: _removed, ...rest } = state.items;
      return {
        order: state.order.filter(id => id !== action.id),
        items: rest,
      };
    }
    default:
      return state;
  }
}

export interface DownloadManagerContextValue {
  downloads: DownloadItem[];
  hasActiveDownloads: boolean;
  startDownload: (request: StartDownloadRequest) => string;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  retryDownload: (id: string) => void;
  getDownload: (id: string) => DownloadItem | undefined;
}

export const DownloadManagerContext =
  createContext<DownloadManagerContextValue | null>(null);

const generateId = () => `download-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const DownloadManagerProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(downloadsReducer, initialState);
  const controllersRef = useRef<Map<string, SimulatedDownloadController>>(new Map());
  const configsRef = useRef<Map<string, DownloadConfig>>(new Map());
  const callbacksRef = useRef<Map<string, DownloadCallbacks>>(new Map());

  useEffect(() => {
    return () => {
      controllersRef.current.forEach(controller => controller.cancel());
      controllersRef.current.clear();
      configsRef.current.clear();
      callbacksRef.current.clear();
    };
  }, []);

  const getDownload = useCallback<DownloadManagerContextValue['getDownload']>(
    id => state.items[id],
    [state.items]
  );

  const startDownload = useCallback<DownloadManagerContextValue['startDownload']>(
    request => {
      const id = request.id ?? generateId();
      const now = Date.now();
      const totalBytes = Math.max(0, Math.floor(request.totalBytes));
      const failAtBytes =
        typeof request.failAtBytes === 'number'
          ? Math.max(0, Math.floor(request.failAtBytes))
          : undefined;
      const chunkSize =
        typeof request.chunkSize === 'number' && request.chunkSize > 0
          ? Math.max(1, Math.floor(request.chunkSize))
          : undefined;
      const intervalMs =
        typeof request.intervalMs === 'number' && request.intervalMs > 0
          ? Math.max(1, Math.floor(request.intervalMs))
          : undefined;
      const config: DownloadConfig = {
        totalBytes,
        chunkSize,
        intervalMs,
        failAtBytes,
      };

      controllersRef.current.get(id)?.cancel();
      controllersRef.current.delete(id);

      configsRef.current.set(id, config);
      callbacksRef.current.set(id, {
        onProgress: request.onProgress,
        onComplete: request.onComplete,
        onError: request.onError,
      });

      dispatch({
        type: 'ADD',
        payload: {
          id,
          label: request.label,
          source: request.source,
          status: 'downloading',
          bytesDownloaded: 0,
          totalBytes,
          progress: 0,
          startedAt: now,
          updatedAt: now,
        },
      });

      const controller = createSimulatedDownload({
        totalBytes: config.totalBytes,
        chunkSize: config.chunkSize,
        intervalMs: config.intervalMs,
        failAtBytes: config.failAtBytes,
        onProgress: downloadedBytes => {
          dispatch({ type: 'PROGRESS', id, bytesDownloaded: downloadedBytes });
          callbacksRef.current.get(id)?.onProgress?.(downloadedBytes);
        },
        onComplete: () => {
          const completedAt = Date.now();
          dispatch({ type: 'COMPLETE', id, completedAt });
          callbacksRef.current.get(id)?.onComplete?.();
          controllersRef.current.delete(id);
          configsRef.current.delete(id);
          callbacksRef.current.delete(id);
        },
        onError: error => {
          const at = Date.now();
          dispatch({ type: 'FAIL', id, error: error.message, at });
          callbacksRef.current.get(id)?.onError?.(error);
          controllersRef.current.delete(id);
          configsRef.current.set(id, { ...config, failAtBytes: undefined });
        },
      });

      controllersRef.current.set(id, controller);
      controller.start();

      return id;
    },
    []
  );

  const pauseDownload = useCallback<DownloadManagerContextValue['pauseDownload']>(
    id => {
      const controller = controllersRef.current.get(id);
      if (!controller) return;
      controller.pause();
      dispatch({ type: 'PAUSE', id });
    },
    []
  );

  const resumeDownload = useCallback<DownloadManagerContextValue['resumeDownload']>(
    id => {
      const controller = controllersRef.current.get(id);
      if (!controller) return;
      controller.resume();
      dispatch({ type: 'RESUME', id });
    },
    []
  );

  const removeDownload = useCallback<DownloadManagerContextValue['removeDownload']>(
    id => {
      const controller = controllersRef.current.get(id);
      controller?.cancel();
      controllersRef.current.delete(id);
      configsRef.current.delete(id);
      callbacksRef.current.delete(id);
      dispatch({ type: 'REMOVE', id });
    },
    []
  );

  const retryDownload = useCallback<DownloadManagerContextValue['retryDownload']>(
    id => {
      const config = configsRef.current.get(id);
      if (!config) return;

      const activeConfig: DownloadConfig = { ...config };
      configsRef.current.set(id, activeConfig);

      controllersRef.current.get(id)?.cancel();

      const callbacks = callbacksRef.current.get(id);
      const now = Date.now();
      dispatch({ type: 'RETRY', id, startedAt: now });

      const controller = createSimulatedDownload({
        totalBytes: activeConfig.totalBytes,
        chunkSize: activeConfig.chunkSize,
        intervalMs: activeConfig.intervalMs,
        failAtBytes: activeConfig.failAtBytes,
        onProgress: downloadedBytes => {
          dispatch({ type: 'PROGRESS', id, bytesDownloaded: downloadedBytes });
          callbacks?.onProgress?.(downloadedBytes);
        },
        onComplete: () => {
          const completedAt = Date.now();
          dispatch({ type: 'COMPLETE', id, completedAt });
          callbacks?.onComplete?.();
          controllersRef.current.delete(id);
          configsRef.current.delete(id);
          callbacksRef.current.delete(id);
        },
        onError: error => {
          const at = Date.now();
          dispatch({ type: 'FAIL', id, error: error.message, at });
          callbacks?.onError?.(error);
          controllersRef.current.delete(id);
          configsRef.current.set(id, { ...activeConfig, failAtBytes: undefined });
        },
      });

      controllersRef.current.set(id, controller);
      controller.start();
    },
    []
  );

  const downloads = useMemo(() => state.order.map(id => state.items[id]).filter(Boolean), [
    state.order,
    state.items,
  ]);

  const hasActiveDownloads = useMemo(
    () => downloads.some(item => item.status === 'downloading' || item.status === 'paused'),
    [downloads]
  );

  const value = useMemo<DownloadManagerContextValue>(
    () => ({
      downloads,
      hasActiveDownloads,
      startDownload,
      pauseDownload,
      resumeDownload,
      removeDownload,
      retryDownload,
      getDownload,
    }),
    [
      downloads,
      hasActiveDownloads,
      startDownload,
      pauseDownload,
      resumeDownload,
      removeDownload,
      retryDownload,
      getDownload,
    ]
  );

  return <DownloadManagerContext.Provider value={value}>{children}</DownloadManagerContext.Provider>;
};

export default DownloadManagerProvider;
