"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_POLL_INTERVAL = 60000;

export interface UseDiskQuotaOptions {
  /**
   * How frequently to refresh the storage estimate in milliseconds.
   * Set to a non-positive value to disable polling.
   */
  interval?: number;
}

export interface DiskQuotaState {
  supported: boolean;
  usage: number | null;
  quota: number | null;
  usageRatio: number;
  usageDetails: StorageEstimate['usageDetails'] | null;
  loading: boolean;
  error: boolean;
}

export interface UseDiskQuotaResult extends DiskQuotaState {
  refresh: () => Promise<StorageEstimate | null>;
}

const readNumber = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export default function useDiskQuota(
  options: UseDiskQuotaOptions = {},
): UseDiskQuotaResult {
  const interval = options.interval ?? DEFAULT_POLL_INTERVAL;
  const supported =
    typeof navigator !== 'undefined' &&
    typeof navigator.storage?.estimate === 'function';

  const mountedRef = useRef(false);
  const [state, setState] = useState<DiskQuotaState>(() => ({
    supported,
    usage: null,
    quota: null,
    usageRatio: 0,
    usageDetails: null,
    loading: supported,
    error: false,
  }));

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!supported) return null;
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, loading: prev.usage === null }));
    }
    try {
      const estimate = await navigator.storage.estimate();
      if (!mountedRef.current) return estimate;
      const usage = readNumber(estimate.usage);
      const quota = readNumber(estimate.quota);
      const usageRatio =
        quota && quota > 0 && usage !== null
          ? Math.min(usage / quota, 1)
          : 0;
      setState({
        supported: true,
        usage,
        quota,
        usageRatio,
        usageDetails: estimate.usageDetails ?? null,
        loading: false,
        error: false,
      });
      return estimate;
    } catch {
      if (!mountedRef.current) return null;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: true,
      }));
      return null;
    }
  }, [supported]);

  useEffect(() => {
    if (!supported) return undefined;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      setState((prev) => ({ ...prev, loading: prev.usage === null }));
      await refresh();
    };
    run();

    if (!Number.isFinite(interval) || interval <= 0) {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setInterval(run, interval);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [interval, refresh, supported]);

  return { ...state, refresh };
}
