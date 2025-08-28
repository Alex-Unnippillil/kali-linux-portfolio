import { useEffect, useRef } from 'react';
/**
 * Simple game loop helper that provides frame-time delta in seconds to the
 * callback. The loop runs only while `running` is true.
 */
export default function useGameLoop(callback, running = true) {
    const cb = useRef(callback);
    cb.current = callback;
    useEffect(() => {
        if (!running)
            return undefined;
        let raf;
        let last = performance.now();
        const loop = (now) => {
            const delta = (now - last) / 1000;
            last = now;
            cb.current(delta);
            raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, [running]);
}
