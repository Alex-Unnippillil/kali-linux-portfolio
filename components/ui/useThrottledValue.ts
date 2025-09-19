import { useEffect, useRef, useState } from 'react';

const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * Throttles rapidly changing values so the consuming UI updates at most `maxUpdatesPerSecond` times.
 * Falls back to immediate updates when requestAnimationFrame is unavailable.
 */
export function useThrottledValue<T>(value: T, maxUpdatesPerSecond = 10): T {
    const [throttledValue, setThrottledValue] = useState<T>(value);
    const timeoutRef = useRef<number | null>(null);
    const lastUpdateRef = useRef(0);

    useEffect(() => {
        if (typeof window === 'undefined') {
            setThrottledValue(value);
            return;
        }

        const interval = 1000 / Math.max(1, maxUpdatesPerSecond);
        const now = getNow();
        const elapsed = now - lastUpdateRef.current;

        if (elapsed >= interval) {
            lastUpdateRef.current = now;
            setThrottledValue(value);
            return () => {
                if (timeoutRef.current !== null) {
                    window.clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
            };
        }

        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(() => {
            lastUpdateRef.current = getNow();
            setThrottledValue(value);
            timeoutRef.current = null;
        }, interval - elapsed);

        return () => {
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [value, maxUpdatesPerSecond]);

    useEffect(() => () => {
        if (timeoutRef.current !== null && typeof window !== 'undefined') {
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    return throttledValue;
}

export default useThrottledValue;
