import React, { useCallback, useEffect, useRef, useState } from 'react';
/**
 * Heads up display for games. Provides pause/resume, sound toggle and
 * frames-per-second counter. Can be dropped into any game component.
 */
export default function Overlay({ onPause, onResume, muted: externalMuted, onToggleSound, }) {
    const [paused, setPaused] = useState(false);
    const [muted, setMuted] = useState(externalMuted ?? false);
    const [fps, setFps] = useState(0);
    const frame = useRef(performance.now());
    const count = useRef(0);
    // track fps using requestAnimationFrame
    useEffect(() => {
        let raf;
        const measure = (now) => {
            count.current += 1;
            if (now - frame.current >= 1000) {
                setFps(count.current);
                count.current = 0;
                frame.current = now;
            }
            raf = requestAnimationFrame(measure);
        };
        raf = requestAnimationFrame(measure);
        return () => cancelAnimationFrame(raf);
    }, []);
    const togglePause = useCallback(() => {
        setPaused((p) => {
            const np = !p;
            np ? onPause?.() : onResume?.();
            return np;
        });
    }, [onPause, onResume]);
    const toggleSound = useCallback(() => {
        setMuted((m) => {
            const nm = !m;
            onToggleSound?.(nm);
            return nm;
        });
    }, [onToggleSound]);
    useEffect(() => {
        if (externalMuted !== undefined) {
            setMuted(externalMuted);
        }
    }, [externalMuted]);
    return (<div className="game-overlay">
      <button onClick={togglePause} aria-label={paused ? 'Resume' : 'Pause'}>
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button onClick={toggleSound} aria-label={muted ? 'Unmute' : 'Mute'}>
        {muted ? 'Sound' : 'Mute'}
      </button>
      <span className="fps">{fps} FPS</span>
    </div>);
}
