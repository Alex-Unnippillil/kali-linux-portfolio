'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type HeartbeatStatus = 'connected' | 'disconnected' | 'reconnecting';

interface PromiseController {
  promise: Promise<void>;
  resolve: () => void;
}

export interface UseHeartbeatOptions {
  intervalMs?: number;
  countdownSeconds?: number;
  onDisconnect?: () => void;
}

export interface HeartbeatState {
  status: HeartbeatStatus;
  countdown: number | null;
  lastPingAt: number | null;
  waitForReconnect: () => Promise<void>;
}

const DEFAULT_INTERVAL = 4000;
const DEFAULT_COUNTDOWN = 3;

export function useHeartbeat({
  intervalMs = DEFAULT_INTERVAL,
  countdownSeconds = DEFAULT_COUNTDOWN,
  onDisconnect,
}: UseHeartbeatOptions = {}): HeartbeatState {
  const [status, setStatus] = useState<HeartbeatStatus>('connected');
  const statusRef = useRef<HeartbeatStatus>('connected');
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const promiseRef = useRef<PromiseController | null>(null);
  const disconnectRef = useRef<(() => void) | undefined>(onDisconnect);

  useEffect(() => {
    disconnectRef.current = onDisconnect;
  }, [onDisconnect]);

  const ensurePromise = useCallback(() => {
    if (promiseRef.current) return promiseRef.current;
    let resolve: () => void = () => {};
    const promise = new Promise<void>((res) => {
      resolve = res;
    });
    promiseRef.current = { promise, resolve };
    return promiseRef.current;
  }, []);

  const waitForReconnect = useCallback(() => {
    if (statusRef.current === 'connected' && countdownRef.current === null) {
      return Promise.resolve();
    }
    return ensurePromise().promise;
  }, [ensurePromise]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let heartbeatTimer: number | undefined;
    let countdownTimer: number | undefined;

    const resolvePromise = () => {
      if (promiseRef.current) {
        const { resolve } = promiseRef.current;
        promiseRef.current = null;
        resolve();
      }
    };

    const stopCountdown = () => {
      if (countdownTimer !== undefined) {
        window.clearTimeout(countdownTimer);
        countdownTimer = undefined;
      }
      countdownRef.current = null;
      setCountdown(null);
    };

    const transitionToConnected = () => {
      stopCountdown();
      statusRef.current = 'connected';
      setStatus('connected');
      resolvePromise();
    };

    const startReconnectCountdown = () => {
      if (statusRef.current === 'reconnecting' && countdownRef.current !== null) {
        return;
      }
      stopCountdown();
      ensurePromise();
      const start = Math.max(0, Math.floor(countdownSeconds));
      if (start <= 0) {
        transitionToConnected();
        return;
      }
      statusRef.current = 'reconnecting';
      setStatus('reconnecting');
      countdownRef.current = start;
      setCountdown(start);
      const scheduleNextTick = () => {
        countdownTimer = window.setTimeout(() => {
          if (countdownRef.current === null) {
            return;
          }
          const next = countdownRef.current - 1;
          countdownRef.current = next;
          setCountdown(next >= 0 ? next : 0);
          if (next <= 0) {
            transitionToConnected();
          } else {
            scheduleNextTick();
          }
        }, 1000);
      };

      scheduleNextTick();
    };

    const setDisconnected = () => {
      if (statusRef.current === 'disconnected') {
        return;
      }
      stopCountdown();
      promiseRef.current = null;
      statusRef.current = 'disconnected';
      setStatus('disconnected');
      disconnectRef.current?.();
    };

    const isOnline = () => {
      if (typeof navigator === 'undefined' || typeof navigator.onLine === 'undefined') {
        return true;
      }
      return navigator.onLine;
    };

    const checkHeartbeat = () => {
      setLastPingAt(Date.now());
      if (!isOnline()) {
        setDisconnected();
      } else if (statusRef.current === 'disconnected') {
        startReconnectCountdown();
      }
    };

    const handleOffline = () => {
      setLastPingAt(Date.now());
      setDisconnected();
    };

    const handleOnline = () => {
      setLastPingAt(Date.now());
      if (statusRef.current !== 'connected') {
        startReconnectCountdown();
      }
    };

    heartbeatTimer = window.setInterval(checkHeartbeat, intervalMs);
    checkHeartbeat();

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      if (heartbeatTimer !== undefined) {
        window.clearInterval(heartbeatTimer);
      }
      if (countdownTimer !== undefined) {
        window.clearTimeout(countdownTimer);
      }
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [countdownSeconds, ensurePromise, intervalMs]);

  return {
    status,
    countdown,
    lastPingAt,
    waitForReconnect,
  };
}
